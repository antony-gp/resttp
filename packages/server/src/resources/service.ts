export interface IPagination<T> {
  total: number;
  pages: number;
  page: number;
  perPage: number;
  items: T[];
}

export abstract class Service<C = Record<string, any>, U = C, R = C> {
  abstract list(): Promise<IPagination<C>>;
  abstract findByKey(key: string | number): Promise<C>;
  abstract create(): Promise<C>;
  abstract update(key: string | number): Promise<U>;
  abstract delete(key: string | number): Promise<void>;
  abstract format(data: C): R;
}
