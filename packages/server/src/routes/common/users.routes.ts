import { Router } from 'express';
import { z } from 'zod';

import { getUserById } from '../../services/soundcloud.service.js';

const userQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export const usersRouter = Router();

usersRouter.get('/users', async (req, res) => {
  const { userId } = userQuerySchema.parse(req.query);
  const user = await getUserById(userId);

  res.json(user);
});
