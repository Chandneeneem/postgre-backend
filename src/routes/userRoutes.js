const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');


router.get('/users', authenticateToken, userController.getUsers);
router.post('/users', userController.addNewUser);
router.post('/users/login', userController.login);
router.put('/users/update/:id', authenticateToken, userController.updateUser);
router.delete('/users/delete/:id', authenticateToken, userController.deleteUser);

module.exports = router;
