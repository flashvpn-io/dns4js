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
      if (result?.guide !== undefined) {
        expect(result.guide).toBeDefined();
      }
    });

    it("should return null for a domain without TXT record", async () => {
      // Use a domain that definitely doesn't have the expected TXT record format
      // jetstream.site has google-site-verification but not our expected format
      // Suppress console.error for this test since we expect no DNS record
      const originalError = console.error;
      console.error = jest.fn();
      
      const result = await DnsHelper.lookupTxt("nonexistent-dns-record-12345.example.com");
      
      // Restore console.error
      console.error = originalError;
      
      expect(result).toBeNull();
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
        '"host=example.com:web=www.example.com:aff=affiliate.example.com:api=api.example.com:app=app.example.com:landing=landing.example.com:guide=guide.example.com"';
      const result = DnsHelper._parseData(data);
      expect(result).toEqual({
        host: ["example.com"],
        web: ["www.example.com"],
        aff: ["affiliate.example.com"],
        api: ["api.example.com"],
        app: ["app.example.com"],
        landing: ["landing.example.com"],
        guide: ["guide.example.com"],
      });
    });
  });
});
