import http.server
import socketserver
import json
import subprocess
import time
import sys

class ExecutionHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format%args))

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'healthy'}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/execute':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid JSON: ' + str(e)}).encode('utf-8'))
                return

            language = payload.get('language', 'javascript')
            source_code = payload.get('sourceCode', '')
            stdin_data = payload.get('stdin', source_code)
            timeout_ms = int(payload.get('timeout', 5000))
            memory = payload.get('memory', '128m')
            cpu = payload.get('cpu', '0.5')

            # Map language to docker run parameters
            if language == 'python':
                image = 'python:3.10-alpine'
                cmd = ['python', '-']
            else:
                image = 'node:22-alpine'
                cmd = ['node']

            import uuid
            container_name = f"coach-exec-{uuid.uuid4().hex}"

            docker_cmd = [
                'docker', 'run',
                '--name', container_name,
                '-i',
                '--rm',
                f'--memory={memory}',
                f'--cpus={cpu}',
                image
            ] + cmd

            start_time = time.perf_counter()
            
            try:
                proc = subprocess.Popen(
                    docker_cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                timeout_sec = timeout_ms / 1000.0
                try:
                    stdout, stderr = proc.communicate(input=stdin_data, timeout=timeout_sec)
                    is_timeout = False
                except subprocess.TimeoutExpired:
                    # Kill the container directly using docker kill
                    subprocess.run(['docker', 'kill', container_name], capture_output=True)
                    proc.kill()
                    stdout, stderr = proc.communicate()
                    is_timeout = True

                execution_time = int((time.perf_counter() - start_time) * 1000)
                
                code = proc.returncode
                status = 'ACCEPTED'
                success = True
                
                # Check for output truncation first
                max_output_size = 1024 * 1024
                is_truncated = False
                if len(stdout) > max_output_size:
                    stdout = stdout[:max_output_size] + "\n[Output truncated: Exceeded 1MB limit]"
                    is_truncated = True
                if len(stderr) > max_output_size:
                    stderr = stderr[:max_output_size] + "\n[Error output truncated: Exceeded 1MB limit]"
                    is_truncated = True

                if is_timeout:
                    status = 'TIMEOUT'
                    success = False
                    stderr = stderr + f"\nTime Limit Exceeded: Your code took too long to execute (exceeded limit of {timeout_ms}ms). This is often caused by an infinite loop or a highly inefficient algorithm."
                elif is_truncated:
                    status = 'RUNTIME_ERROR'
                    success = False
                    stderr = stderr + "\nOutput Limit Exceeded: Your program printed too much data to standard output (exceeded limit of 1MB). This is usually caused by an infinite loop containing print/console.log statements."
                elif code != 0:
                    status = 'RUNTIME_ERROR'
                    success = False

                    # Python returns negative return code for processes terminated by signals
                    is_oom = (code == -9 or code == 137)
                    is_segfault = (code == -11 or code == 139)
                    is_div_by_zero = (code == -8 or code == 136)

                    if is_oom:
                        stderr = stderr + "\nOut of Memory: Your program exceeded the maximum memory limit (128 MB). This is usually caused by creating a very large array, an infinite recursion, or storing too many objects in memory."
                    elif is_segfault:
                        stderr = stderr + "\nSegmentation Fault: Your program tried to access a restricted or invalid memory address. In C/C++, this is typically caused by out-of-bounds array access, dereferencing a null/wild pointer, or stack overflow from deep recursion."
                    elif is_div_by_zero:
                        stderr = stderr + "\nArithmetic Exception: Division by zero or illegal arithmetic operation."

                response_payload = {
                    'success': success,
                    'status': status,
                    'stdout': stdout,
                    'stderr': stderr,
                    'executionTime': execution_time,
                    'memoryUsed': 0,
                    'outputTruncated': is_truncated
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_payload).encode('utf-8'))

            except Exception as e:
                execution_time = int((time.perf_counter() - start_time) * 1000)
                response_payload = {
                    'success': False,
                    'status': 'FAILED',
                    'stdout': '',
                    'stderr': f'Docker startup error: {str(e)}',
                    'executionTime': execution_time,
                    'memoryUsed': 0,
                    'outputTruncated': False
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_payload).encode('utf-8'))
            finally:
                # Force clean up the container just in case it didn't get removed automatically
                subprocess.run(['docker', 'rm', '-f', container_name], capture_output=True)
        else:
            self.send_response(404)
            self.end_headers()


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run_server(port=5000):
    server_address = ('', port)
    httpd = ThreadedHTTPServer(server_address, ExecutionHandler)
    print(f"Starting remote execution server on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Stopping server...")

if __name__ == '__main__':
    port = 5000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run_server(port)
