import { injectable } from "inversify";
import "dotenv/config";

@injectable()
export class EnvConfig {
  public get(key: string): string | null {
    const value = process.env[key];
    return value || null;
  }

  public getOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing ${key} .in env`);
    return value;
  }
}
