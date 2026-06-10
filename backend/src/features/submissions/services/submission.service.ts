import { Submission } from '@prisma/client';
import { submissionRepository } from '../repository/submission.repository.js';
import { codeExecutionService } from '../../../execution/services/CodeExecutionService.js';
import { RunCodeInput, SubmitCodeInput } from '../schemas/submission.schema.js';
import { mapStringToLanguage, CodeExecutionResult } from '../../../execution/types/execution.types.js';
import { NotFoundError } from '../../../shared/errors/custom.errors.js';
import { prisma } from '../../../database/prisma.js';
import { logger } from '../../../shared/utils/logger.js';

export class SubmissionService {
  async runCode(input: RunCodeInput): Promise<CodeExecutionResult> {
    return codeExecutionService.execute({
      language: input.language,
      sourceCode: input.sourceCode,
    });
  }

  async submitCode(input: SubmitCodeInput) {
    const result = await codeExecutionService.execute({
      language: input.language,
      sourceCode: input.sourceCode,
    });

    const createData: any = {
      language: mapStringToLanguage(input.language),
      status: result.status,
      sourceCode: input.sourceCode,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      outputTruncated: result.outputTruncated,
    };

    if (input.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (userExists) {
        createData.user = { connect: { id: input.userId } };
      } else {
        logger.warn(
          `UserId "${input.userId}" not found in database. Storing submission anonymously.`,
        );
      }
    }

    const submission = await submissionRepository.create(createData);

    return {
      submissionId: submission.id,
      status: submission.status,
      executionTime: submission.executionTime,
      memoryUsed: submission.memoryUsed,
    };
  }

  async getSubmission(id: string): Promise<Submission> {
    const submission = await submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundError(`Submission with ID ${id} not found`);
    }
    return submission;
  }
}

export const submissionService = new SubmissionService();
