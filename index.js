import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import authMiddleware from "./src/middleware/auth.js";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import express from "express";
import http, { createServer } from "http";
import cors from "cors";
import resolvers from "./src/graphql/resolvers/index.js";
import pkg from "mongoose";
import gql from "graphql-tag";
import fs from "fs";

const { connect } = pkg;

const typeDefs = gql(
  fs.readFileSync("./src/graphql/schema/typeDefs.graphql", "utf-8")
);

const MONGODB = process.env.DB_URI;
const PORT = process.env.PORT;

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = createServer(app); 

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

const startServer = async () => {
  app.use(authMiddleware);
  await server.start();
  app.use(
    "/graphql",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.authorization }),
    })
  );
  httpServer.listen(PORT, () => {
    console.log(
      `Server is now running on http://localhost:${process.env.PORT}/graphql`
    );
  });
  await connect(MONGODB);
  console.log("MongoDB Connected");
};

startServer()