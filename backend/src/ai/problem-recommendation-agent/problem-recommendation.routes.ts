import { Router } from "express";
import { problemRecommendationGraph }
from "./problemRecommendationGraph.js";

const router = Router();

router.post(
  "/run",
  async (req, res, next) => {
    try {
      const { userId } = req.body;

      const result =
        await problemRecommendationGraph.invoke({
          userId,
        });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;