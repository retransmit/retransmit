import request = require("supertest");
import { startWithConfiguration } from "../../../../../..";
import startBackends from "./startBackends";
import { closeHttpServer } from "../../../../../utils";
import random from "../../../../../../lib/random";
import { Server } from "http";
import WebSocket from "ws";

export default async function (app: {
  servers: {
    httpServer: Server;
    websocketServers: WebSocket.Server[];
  };
}) {
  it(`rolls back`, async () => {
    const config = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  rollbackUrl: "http://localhost:6666/users/remove",
                },
                messagingservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/messages",
                },
              },
            },
          },
        },
      },
    };

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );
    app.servers = servers;

    let calledRollback = false;
    let backendApps: Server[] = [];
    const calledPromise = new Promise((success) => {
      // Start mock servers.
      backendApps = startBackends([
        {
          port: 6666,
          afterResponse: async (ctx: any) => {
            if (ctx.path === "/users/remove" && ctx.method === "POST") {
              ctx.body = "Deleted";
              calledRollback = true;
              success();
              return true;
            }
          },
          routes: [
            {
              path: "/users",
              method: "POST",
              response: {
                body: {
                  user: 1,
                },
              },
            },
          ],
        },
        {
          port: 6667,
          routes: [
            {
              path: "/messages",
              method: "POST",
              response: {
                status: 400,
                body: "I don't like the input.",
              },
            },
          ],
        },
      ]);
    });

    const response = await request(app.servers.httpServer)
      .post("/users")
      .send({ hello: "world" })
      .set("origin", "http://localhost:3000");

    await calledPromise;

    for (const backendApp of backendApps) {
      await closeHttpServer(backendApp);
    }

    calledRollback.should.be.true();
    response.status.should.equal(400);
    response.text.should.equal("I don't like the input.");
  });
}