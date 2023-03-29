import { getInstance, initIndexDb } from "./indexDb";

export type DbRecord = {
  id?: string;
  key: string;
  value: string;
};

export class CacheDbStorage {
  dbName: string;
  tableName: string;
  isInitDb: boolean;
  constructor() {
    this.dbName = "vjmapCache";
    this.tableName = "cache";
    this.isInitDb = false;
  }

  public async init() {
    if (this.isInitDb) return;
    await initIndexDb({
      dbName: this.dbName, // 数据库名称
      version: 1, // 版本号
      tables: [
        {
          tableName: this.tableName, // 表名
          option: { keyPath: "id", autoIncrement: true }, // 指明主键为id
          indexs: [
            // 数据库索引
            {
              key: "id",
              option: {
                unique: true,
              },
            },
            {
              key: "key",
            },
            {
              key: "value",
            },
          ],
        },
      ],
    });
    this.isInitDb = true;
  }

  public getInst() {
    return getInstance(this.dbName);
  }
  public async getAll() {
    await this.init();
    return await this.getInst().queryAll<DbRecord>({
      tableName: this.tableName,
    });
  }

  public async getRecordByKey(key: string) {
    await this.init();
    return await this.getInst().query<DbRecord>({
      tableName: this.tableName,
      condition: (item) => item.key === key,
    });
  }

  public async getValueByKey(key: string, parseJson?: boolean) {
    const records = await this.getRecordByKey(key);
    if (records.length == 0) return;
    if (parseJson === true) {
        return JSON.parse(records[0].value);
    }
    return records[0].value;
  }

  public async setValueByKey(key: string, value: any, toJson?: boolean) {
    return await this.upsert({
      key,
      value: toJson === true ? JSON.stringify(value, null, 0) : value
    })
  }

  public async upsert(record: DbRecord) {
    await this.init();
    const records = await this.getRecordByKey(record.key);
    if (records.length == 0) {
      // 新增
      return await this.getInst().insert<DbRecord>({
        tableName: this.tableName,
        data: record,
      });
    } else {
      // 修改
      return await this.getInst().update<DbRecord>({
        tableName: this.tableName,
        condition: (item) => item.key === record.key,
        handle: (r) => {
          r.value = record.value;
          return r;
        },
      });
    }
  }

  public async deleteRecord(key: string) {
    await this.init();
    return await this.getInst().delete<DbRecord>({
      tableName: this.tableName,
      condition: (item) => item.key === key,
    });
  }

  public async deleteTable() {
    await this.init();
    return await this.getInst().delete_table(this.tableName);
  }

  public async deleteDb() {
    await this.init();
    return await this.getInst().delete_db(this.dbName);
  }

  public toStringKey(key: Record<string, any>, prefix?: string): string {
    prefix = prefix ?? ""
    return prefix + JSON.stringify(key, null, 0)
  }
}

const cacheStorage = new CacheDbStorage();
export {
  cacheStorage
};
