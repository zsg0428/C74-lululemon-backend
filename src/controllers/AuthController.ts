import gDB from '../InitDataSource'
import { UserEntity } from '../entity/User.entity'
import { NextFunction, Request, Response } from 'express'
import { validate } from 'class-validator'
import * as jwt from 'jsonwebtoken'
import { CLog } from '../AppHelper'

class AuthController {
  static db = gDB.getRepository(UserEntity)

  // new users signup
  static async signUp(req: Request, res: Response) {
    const { email, password } = req.body

    if (!(email && password)) {
      return res.status(400).send('Invalid email or password.')
    }

    const db = gDB.getRepository(UserEntity)

    let user = new UserEntity()
    user.email = email
    user.password = password

    user.hashPassword()

    try {
      const error = await validate(user, { groups: ['signUp'] })
      if (error.length > 0) {
        CLog.bad('Validation failed: ', error)
        return res.status(400).send({
          'Validation failed: ': error,
        })
      }
      user = await db.save(user)

      return res
        .status(201)
        .send(`User info, ${user.id}, ${user.email}, ${user.password}`)
    } catch (err) {
      CLog.bad('Sign up failed: ', err)
      res.status(400).send('Sign up failed.')
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body
    let user = new UserEntity()
    user.email = email
    user.password = password
    // No email and password then return
    if (!(email && password)) {
      return res
        .status(400)
        .send('Please Enter Correct Email and Password To Log in')
    }

    try {
      // validate user's email and password input
      const errors = await validate(user, { skipMissingProperties: true })
      if (errors.length > 0) {
        return res
          .status(400)
          .send('We could not find your email address or password')
      }
      // find user by email
      user = await AuthController.db.findOneOrFail({
        where: {
          email: email,
        },
      })
      // if no user found, return to client
      if (!user) {
        return res.status(404).send('User not found')
      }
      // compare crypted password with input password
      const isPasswordCorrect = user.validatePlainPassword(password)

      if (!isPasswordCorrect) {
        return res.status(401).send('Incorrect password')
      }
      // Create token and send it back to the user
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        process.env.JWT_SECRET,
        { expiresIn: 60 * 10 },
      )

      // Delete password before sending it back to the client
      const userInformation = { ...user }
      delete userInformation.password
      return res.status(200).send({ user: userInformation, token })
    } catch (e) {
      return res
        .status(400)
        .send('Login Failed, please check your email and password. Try Again!')
    }
  }
}

export default AuthController
