import { IncomingMessage } from "http";
import { Controller } from "../resources/controller";

export class Request implements IRequest {
  private message;
  method: Method;
  url: URL;
  headers: Record<string, any>;
  timeout: number;
  maxLength: number;
  params: Record<string, any>;
  body: Record<string, any>;
  handlers: ((...args: any) => Promise<any>)[];
  parents: Map<string, Awaited<ReturnType<Controller["get"]>>>;

  constructor(message: IncomingMessage) {
    this.message = message;

    this.method = this.message.method as Method;

    // TODO: add https
    this.url = new URL(this.message.url, `http://${this.message.headers.host}`);

    this.headers = this.message.headers;

    this.handlers = [];

    this.params = {};

    // TODO: make this configurable
    this.timeout = Infinity;
    this.maxLength = Infinity;
  }

  // TODO: read data only, and make the funtion extensible
  async read(): Promise<void> {
    const data = await new Promise<string>((resolve) => {
      const buffer: Uint8Array[] = [];

      this.message
        .on("data", (chunk) => buffer.push(chunk))
        .on("end", () => resolve(buffer.toString()));
    });

    data && (this.body = JSON.parse(data));
  }

  private attatchParams(controller: Controller, paths: string[]): void {
    const splittedPath = controller.path.split("/").filter(Boolean);

    splittedPath.length < paths.length &&
      controller.key &&
      splittedPath.push(`:${controller.key}`);

    const entries = splittedPath.reduce(
      (arr: [string, string][], path, index) => (
        path.startsWith(":") && arr.push([path.slice(1), paths[index]]), arr
      ),
      []
    );

    for (const [path, value] of entries) this.params[path] = value;
  }

  private searchController(
    controller: Controller,
    [keyOrRelative, ...children]: string[]
  ): Controller {
    if (controller && keyOrRelative) {
      let innerController = controller.relatives.get(`/${keyOrRelative}`);

      if (innerController)
        return this.searchController(innerController, children);

      innerController = controller.children.get(`/${children[0]}`);

      if (innerController) {
        this.handlers.push(controller.get);
        return this.searchController(innerController, children.slice(1));
      }
    }

    if (!children.length) return controller;
  }

  getController(controllers: Map<string, Controller>): Controller | void {
    const paths = this.url.pathname.split("/").filter(Boolean);

    const controller = this.searchController(
      controllers.get(`/${paths[0]}`),
      paths.slice(1)
    );

    controller && this.attatchParams(controller, paths);

    return controller;
  }
}

export interface IRequest {
  url: URL;
  method: Method;
  headers?: Record<string, any>;
  params?: Record<string, any>;
  body?: any;
  timeout: number;
  maxLength?: number;
}

export interface IResponse<T> {
  status: Status;
  body?: T;
}

export enum Status {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  IMUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  ContentTooLarge = 413,
  URITooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  ImATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableContent = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

export const Methods = <const>["GET", "POST", "PUT", "DELETE", "PATCH"];

export type Method = (typeof Methods)[number];
