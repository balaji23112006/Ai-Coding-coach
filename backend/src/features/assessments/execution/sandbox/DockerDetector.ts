import { execSync } from 'child_process';
import { logger } from '../../../../utils/logger.js';

let isDockerAvailable = false;
let checkPerformed = false;

export function checkDockerAvailability(): boolean {
  if (checkPerformed) {
    return isDockerAvailable;
  }

  checkPerformed = true;

  if (process.env.USE_DOCKER_SANDBOX === 'false') {
    logger.info('Docker Sandbox execution explicitly disabled in configuration. Using Local Mode.');
    isDockerAvailable = false;
    return false;
  }

  try {
    // Execute command with a short timeout to prevent startup hangs
    execSync('docker ps', { stdio: 'ignore', timeout: 2000 });
    isDockerAvailable = true;
    logger.info('Docker Daemon detected. Sandbox execution will use Docker containers.');
  } catch {
    isDockerAvailable = false;
    logger.warn(
      'Docker Daemon is not running or not available. Falling back to local process execution sandbox.',
    );
  }

  return isDockerAvailable;
}
