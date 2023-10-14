import { IRequest, IResponse } from "../http/request";
import { Service } from "./service";
export abstract class Controller<C = Record<string, any>, U = C, R = C> {
  private _path: string;
  private _key: string;
  private _keyPath: string;
  private _service: Service;
  private _parent: Controller;
  private _children: Map<string, Controller>;
  private _relatives: Map<string, Controller>;

  constructor(
    path: string,
    service: new () => Service<C, U, R>,
    config: {
      key?: string;
    } = {}
  ) {
    this._service = new service();
    this._key = config.key || "id";
    this._path = `/${path.slice(+path.startsWith("/"))}`;
    this._keyPath = `${this._path}/:${this._key}`;
    this._children = new Map();
    this._relatives = new Map();
  }

  get path() {
    return this._path;
  }

  get key() {
    return this._key;
  }

  get service() {
    return this._service;
  }

  get parent() {
    return this._parent;
  }

  get children() {
    return this._children;
  }

  get relatives() {
    return this._relatives;
  }

  append(as: "child" | "relative", ...controllers: Controller[]): void {
    const parentPath = this.path.concat(
      as === "child" ? `/:${this.path.split("/").pop()}` : ""
    );

    for (const controller of controllers) {
      const searchPath = controller._path;

      controller._parent = this;
      controller._path = parentPath + searchPath;
      controller._keyPath = parentPath + controller._keyPath;
      (as === "child" ? this._children : this._relatives).set(
        searchPath,
        controller
      );
    }
  }

  get?(request: IRequest): Promise<IResponse<R | R[]>>;
  post?(request: IRequest): Promise<IResponse<C>>;
  put?(request: IRequest): Promise<IResponse<C>>;
  patch?(request: IRequest): Promise<IResponse<U>>;
  delete?(request: IRequest): Promise<IResponse<R | undefined>>;
}
