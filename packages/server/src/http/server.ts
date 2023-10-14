import { Server as DefaultServer, IncomingMessage, ServerResponse } from "http";
import { Request, Status, Method, Methods } from "./request";
import { Controller } from "../resources/controller";
import { IResponse } from "./request";

export class Server {
  private port: number;
  private server: DefaultServer;
  private controllers: Map<string, Controller>;

  constructor(port: number, ...controllers: Controller[]) {
    this.port = port;
    this.server = new DefaultServer(this.handle.bind(this));

    this.controllers = new Map(
      controllers
        .sort(({ path: p1 }, { path: p2 }) => (p1 > p2 ? 1 : p2 > p1 ? -1 : 0))
        .map((controller) => [controller.path, controller])
    );
  }

  private async handle(message: IncomingMessage, response: ServerResponse) {
    try {
      const request = new Request(message);

      const controller = request.getController(this.controllers);

      if (!controller)
        return this.send(response, {
          status: Status.NotFound,
          body: {
            message: `Path ${request.url.pathname} was not found`,
          },
        });

      const method = request.method.toLowerCase() as Lowercase<Method>;

      if (!(method in controller)) {
        response.setHeader(
          "Allow",
          Methods.reduce(
            (arr, method) => (
              method.toLowerCase() in controller && arr.push(method), arr
            ),
            []
          ).join(", ")
        );

        return this.send(response, {
          status: Status.MethodNotAllowed,
          body: {
            message: `Method not allowed`,
          },
        });
      }

      await request.read();

      this.send(response, await controller[method](request));
    } catch (error) {
      // TODO: create custom errors
      console.error(
        `\x1B[0;1;30m[ ${new Date().toISOString()} ]\x1B[0;1;3;31m  ${
          error.stack
        }\x1B[0m`
      );

      this.send(response, {
        status: Status.InternalServerError,
        body: { message: "Internal server errror" },
      });
    }
  }

  private send(response: ServerResponse, data: IResponse<Record<string, any>>) {
    response.setHeader("Content-Type", "application/json");
    response.statusCode = data.status;
    response.end(data.body && JSON.stringify(data.body));
  }

  start() {
    this.server.listen(this.port, () => {
      // TODO: create log module
      const prefix = "\x1B[0;2;33m[\x1B[0;1;33mResttp\x1B[0;2;33m]\x1B[0;30m ";

      console.log(
        prefix,
        `Started server at \x1B[0;1m${new Date().toLocaleString()}`
      );

      console.log(prefix, `Running on port \x1B[0;1m${this.port}`);
    });
  }
}
