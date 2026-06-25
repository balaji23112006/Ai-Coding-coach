import { Router } from "express";
import { prisma } from "../../database/prisma.js";
import { problemRecommendationGraph } from "./problemRecommendationGraph.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { RECOMMENDATION_CONFIG } from "./config.js";

const router = Router();

router.post(
  "/run-background",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }

      // Deduplication check
      const existingPending = await prisma.recommendation.findFirst({
        where: { userId, status: "PENDING" },
      });

      if (existingPending) {
        // If it's older than 2 minutes, mark it as FAILED (stuck job)
        const ageInMs = Date.now() - new Date(existingPending.createdAt).getTime();
        if (ageInMs > 2 * 60 * 1000) {
          await prisma.recommendation.update({
            where: { id: existingPending.id },
            data: { status: "FAILED", data: { error: "Job stuck and timed out" } }
          });
        } else {
          return res.status(202).json({
            success: true,
            data: { jobId: existingPending.id, status: "PENDING" },
          });
        }
      }

      // Create a pending recommendation record
      const recommendation = await prisma.recommendation.create({
        data: {
          userId,
          status: "PENDING",
        },
      });

      // Respond immediately
      res.status(202).json({
        success: true,
        data: { jobId: recommendation.id, status: "PENDING" },
      });

      // Run background job
      (async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort("Recommendation graph timeout"), RECOMMENDATION_CONFIG.GRAPH_TIMEOUT_MS);

          const result = await problemRecommendationGraph.invoke(
            { userId },
            { signal: controller.signal }
          );

          clearTimeout(timeout);

          // Update record with success
          await prisma.recommendation.update({
            where: { id: recommendation.id },
            data: {
              status: "COMPLETED",
              data: result as any,
            },
          });
        } catch (error) {
          console.error("Error in background recommendation agent:", error);
          try {
            await prisma.recommendation.update({
              where: { id: recommendation.id },
              data: {
                status: "FAILED",
                data: { error: "Failed to generate recommendation" },
              },
            });
          } catch (updateError) {
            console.error("Failed to update recommendation status to FAILED:", updateError);
          }
        }
      })();

    } catch (error) {
      console.error("Error initiating problem recommendation agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initiate recommendation generation",
      });
    }
  }
);

router.get(
  "/latest",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }

      // Check if there is a currently running pending recommendation (within last 2 mins)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const pendingJob = await prisma.recommendation.findFirst({
        where: { 
          userId, 
          status: 'PENDING',
          createdAt: { gte: twoMinutesAgo }
        },
      });

      // Always fetch the latest COMPLETED recommendation to show to the user
      const latestCompleted = await prisma.recommendation.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestCompleted) {
        return res.status(200).json({
          success: true,
          data: null,
          isUpdating: !!pendingJob
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: latestCompleted.id,
          status: 'COMPLETED',
          isUpdating: !!pendingJob,
          ...((latestCompleted.data as any) || {}),
        },
      });
    } catch (error) {
      console.error("Error fetching latest recommendation:", error);
      res.status(500).json({ success: false, error: "Failed to fetch recommendation" });
    }
  }
);

export default router;