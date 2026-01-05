import express from 'express';
import auth from '../middlewares/auth.js';
import { listProjects, getProject, createProject, updateProject, deleteProject } from '../controllers/projectController.js';

const router = express.Router();
router.use(auth);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
