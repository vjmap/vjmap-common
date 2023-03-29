export type DbRecord = {
    id?: string;
    key: string;
    value: string;
};
export declare class CacheDbStorage {
    dbName: string;
    tableName: string;
    isInitDb: boolean;
    constructor();
    init(): Promise<void>;
    getInst(): import("./indexDb").TsIndexDb;
    getAll(): Promise<DbRecord[]>;
    getRecordByKey(key: string): Promise<DbRecord[]>;
    getValueByKey(key: string, parseJson?: boolean): Promise<any>;
    setValueByKey(key: string, value: any, toJson?: boolean): Promise<DbRecord>;
    upsert(record: DbRecord): Promise<DbRecord>;
    deleteRecord(key: string): Promise<DbRecord>;
    deleteTable(): Promise<unknown>;
    deleteDb(): Promise<unknown>;
    toStringKey(key: Record<string, any>, prefix?: string): string;
}
declare const cacheStorage: CacheDbStorage;
export { cacheStorage };
