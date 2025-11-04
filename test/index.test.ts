import { DnsHelper, DnsRecord } from "../src/index";

describe("DnsHelper", () => {
  describe("lookupTxt", () => {
    it("should return TXT record for a valid domain", async () => {
      const result = await DnsHelper.lookupTxt("front.jetstream.site");
      expect(result).toBeTruthy();
      expect(result?.web).not.toHaveLength(0);
      expect(result?.aff).not.toHaveLength(0);
      expect(result?.api).not.toHaveLength(0);
      expect(result?.app).not.toHaveLength(0);
      expect(result?.landing).toBeDefined();
    });

    it("should return null for a domain without TXT record", async () => {
      const result = await DnsHelper.lookupTxt("jetstream.site");
      expect(result?.web).toHaveLength(0);
      expect(result?.aff).toHaveLength(0);
      expect(result?.api).toHaveLength(0);
      expect(result?.app).toHaveLength(0);
      expect(result?.landing).toHaveLength(0);
    });
  });

  describe("lookupARecords", () => {
    it("should return A records for a valid domain", async () => {
      const result = await DnsHelper.lookupARecords("google.com");
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });

    it("should return localhost IP for localhost", async () => {
      const result = await DnsHelper.lookupARecords("localhost");
      expect(result).toEqual(["127.0.0.1"]);
    });

    it("should return an empty array for a non-existent domain", async () => {
      const result = await DnsHelper.lookupARecords("nonexistent.example.com");
      expect(result).toEqual([]);
    });
  });

  describe("_parseData", () => {
    it("should correctly parse TXT record data", () => {
      const data =
        '"host=example.com:web=www.example.com:aff=affiliate.example.com:api=api.example.com:app=app.example.com:landing=landing.example.com"';
      const result = DnsHelper._parseData(data);
      expect(result).toEqual({
        web: ["www.example.com"],
        aff: ["affiliate.example.com"],
        api: ["api.example.com"],
        app: ["app.example.com"],
        landing: ["landing.example.com"],
      });
    });
  });
});
