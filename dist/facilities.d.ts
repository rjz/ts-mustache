type MustacheTemplate = any;
type ViewMap = Record<string, MustacheTemplate>;
type GlobStr = string;
type LoaderOpts = {
    files?: GlobStr;
    cacheTemplates?: boolean;
    dir: string;
};
export declare class DefaultLoader<T extends ViewMap = ViewMap> {
    protected cache?: Promise<T>;
    protected opts: Required<LoaderOpts>;
    constructor(opts: LoaderOpts);
    protected fsLoad(): Promise<T>;
    load(): Promise<T>;
    static templateKey(dir: string, filename: string): string;
    static DefaultOptions: {
        files: string;
        cacheTemplates: boolean;
    };
}
interface Loader<T> {
    load(): Promise<T>;
}
export declare class Renderer<T extends ViewMap> {
    protected loader: Loader<T>;
    constructor(loader: Loader<T>);
    render<K extends keyof T>(templateName: K, params: T[K]): Promise<string>;
}
export declare class Declarer {
    protected loader: Loader<ViewMap>;
    constructor(loader: Loader<ViewMap>);
    declare(): Promise<string>;
}
export {};
