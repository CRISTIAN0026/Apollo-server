import User from "../../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GraphQLError } from "graphql";
import { PubSub } from 'graphql-subscriptions';
import 'dotenv/config';

const pubsub = new PubSub();

const SUBSCRIPTION_EVENTS = {
  PERSON_LOGIN: 'PERSON_LOGIN'
}

const Mutation = {
  async registerUser(_, { registerInput: { username, email, password }}, context) {
    const oldUser = await User.findOne({ email });
    if (oldUser) {
      throw new GraphQLError("User already exists.", {
        extensions: {
          code: "BAD_REQUEST",
        },
      });
    }
    if (!username || !email || !password) {
      throw new GraphQLError("Username, email, and password are required.", {
        extensions: {
          code: "BAD_USER_INPUT",
        },
      });
    }
    let encryptedPassword = await bcrypt.hash(password, 10);

    const newUSer = new User({
      username: username,
      email: email.toLowerCase(),
      password: encryptedPassword,
    });

    const token = jwt.sign({ user_id: newUSer._id, email }, process.env.SECRET_KEY, {
      expiresIn: "2h",
    });

    newUSer.token = token;

    const res = await newUSer.save();

    return {
      id: res.id,
      ...res._doc,
    };
  },
  async loginUser(_, { loginInput: { email, password }}, context) {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ user_id: user._id, email }, process.env.SECRET_KEY, {
        expiresIn: "2h",
      });
      user.token = token;

      pubsub.publish(SUBSCRIPTION_EVENTS.PERSON_LOGIN, { personLogin: user })

      return {
        id: user.id,
        ...user._doc,
      };
    } else {
      throw new Error("Incorrect Password");
    }
  },
};
const Query = {
  user: (_, { ID }) => User.findById(ID),
};

const Subscription = {
  personLogin: {
    subscribe: () => pubsub.asyncIterator([SUBSCRIPTION_EVENTS.PERSON_LOGIN])
  }
}

export { Query, Mutation, Subscription };
