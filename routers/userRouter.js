const express = require("express")
const {Signup,Login,LoadUser,UpdateProfilePicture} = require("../controllers/userController")
const withAuth = require("../middleware/withAuth")
const router = express.Router()


router.post("/signup",Signup)

router.post("/login",Login)
router.use(withAuth)
router.post("/loadUser",LoadUser)
router.post("/updateProfilePicture",UpdateProfilePicture)
module.exports = router

