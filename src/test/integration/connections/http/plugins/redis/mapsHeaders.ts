import { TestAppInstance } from "../../..";
import { createClient } from "redis";
import got from "got";
import {  UserAppConfig } from "../../../../../../types/config";
import startRetransmitTestInstance from "../../../../../utils/startRetransmitTestInstance";
import { TestEnv } from "../../../..";

export default async function (app: TestAppInstance, testEnv: TestEnv) {
  it(`maps headers`, async () => {
    const config: UserAppConfig = {
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "redis" as "redis",
                  requestChannel: "input",
                  mapping: {
                    headers: {
                      include: {
                        "x-app-instance": "x-app-id",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        redis: {
          responseChannel: "output",
        },
      },
    };

    const appControl = await startRetransmitTestInstance({ config });

    app.appControl = appControl;

    let subscriberCb: (channel: string, message: string) => void = (a, b) => {};

    const subscriber = createClient();
    subscriber.subscribe("input");
    subscriber.on("message", (c, m) => subscriberCb(c, m));

    let promisedInputMessage = new Promise<{
      channel: string;
      message: string;
    }>((success) => {
      subscriberCb = (channel, message) => success({ channel, message });
    });

    // Make the http request.
    const { port } = appControl;

    const promisedServerRespose = got(`http://localhost:${port}/users`, {
      method: "POST",
      headers: {
        "x-app-instance": "myinst",
      },
      json: {
        username: "jeswin",
      },
      retry: 0,
    });

    const inputMessage = await promisedInputMessage;
    const redisInput = JSON.parse(inputMessage.message);

    const publisher = createClient();

    publisher.publish(
      redisInput.responseChannel,
      JSON.stringify({
        id: redisInput.id,
        service: "userservice",
        response: {
          body: `Value of the header was ${redisInput.request.headers["x-app-id"]}`,
        },
      })
    );

    const serverResponse = await promisedServerRespose;
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Value of the header was myinst");
  });
}
