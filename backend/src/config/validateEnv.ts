export function validateEnv() {
  const required = ['DATABASE_URL', 'GEMINI_API_KEY', 'GROQ_API_KEY'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[ENV] ERROR: Missing required environment variables: ${missing.join(', ')}`);
    console.error(`[ENV] The application may not function correctly. Please check your .env file.`);
  } else {
    console.log('[ENV] All required environment variables are present.');
  }

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.log('[ENV] WARNING: Langfuse keys missing. Telemetry will be disabled.');
  }
}
