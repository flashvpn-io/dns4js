import { get } from "https";

export interface DnsRecord {
  web: string[];
  aff: string[];
  api: string[];
}

export class DnsHelper {
  static timeoutMilliseconds = 1000;
  static https = "https://";

  static _defaultDnsUrls: string[] = [
    "https://doh.pub/dns-query",
    "https://doh.360.cn/resolve",
    "https://dns.alidns.com/resolve",
  ];

  static _dnsCache: Map<string, { ips: string[]; timestamp: number }> =
    new Map();

  static async lookupTxt(
    host: string,
    dnsUrls: string[] = DnsHelper._defaultDnsUrls
  ): Promise<DnsRecord | null> {
    for (const dnsUrl of dnsUrls) {
      try {
        const url = `${dnsUrl}?name=${host}&type=TXT`;
        const response = await DnsHelper._httpGet(url, {
          accept: "application/dns-json",
        });
        const jsonResponse = JSON.parse(response);

        if (jsonResponse.Answer && jsonResponse.Answer.length > 0) {
          for (const answer of jsonResponse.Answer) {
            if (answer.type === 16) {
              // TXT record type
              const rdata = answer.data;
              console.log("Parsed TXT record:", rdata);
              return DnsHelper._parseData(rdata);
            }
          }
        }
      } catch (e) {
        console.warn(`Error occurred: ${e}`);
      }
    }
    console.error(`No DNS record found for ${host}`);
    return null;
  }

  static _parseData(data: string): DnsRecord {
    // Strip the leading and trailing double quotes from the data
    data = data.replace(/^"|"$/g, "");

    const parts = data.split(":");
    let web: string[] = [],
      aff: string[] = [],
      api: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split("=");
      switch (key) {
        case "web":
          value.split(",").forEach((v) => {
            web.push(v);
          });
          break;
        case "aff":
          value.split(",").forEach((v) => {
            aff.push(v);
          });
          break;
        case "api":
          value.split(",").forEach((v) => {
            api.push(v);
          });
          break;
      }
    }

    return { web, aff, api };
  }

  static async lookupARecords(
    domain: string,
    dnsUrls: string[] = DnsHelper._defaultDnsUrls
  ): Promise<string[]> {
    if (domain.toLowerCase() === "localhost") {
      console.log("Skipping DNS lookup for localhost");
      return ["127.0.0.1"];
    }

    // Check cache first
    if (DnsHelper._dnsCache.has(domain)) {
      const cachedResult = DnsHelper._dnsCache.get(domain);
      if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
        console.log(
          `Returning cached A records for ${domain}: ${cachedResult.ips}`
        );
        return cachedResult.ips;
      }
    }

    const requestQuery = `name=${domain}&type=A`;
    const allIps = new Set<string>();

    const promises = dnsUrls.map((dnsUrl) =>
      DnsHelper._queryDnsServer(dnsUrl, requestQuery)
    );
    const results = await Promise.all(promises);

    for (const ips of results) {
      ips.forEach((ip) => allIps.add(ip));
    }

    const uniqueIps = Array.from(allIps);

    // Cache the result
    DnsHelper._dnsCache.set(domain, { ips: uniqueIps, timestamp: Date.now() });

    console.log(
      `Found ${uniqueIps.length} unique IP(s) for ${domain}: ${uniqueIps}`
    );
    return uniqueIps;
  }

  static async _queryDnsServer(
    dnsUrl: string,
    requestQuery: string
  ): Promise<string[]> {
    try {
      const url = `${dnsUrl}?${requestQuery}`;
      const response = await DnsHelper._httpGet(url);
      const jsonResponse = JSON.parse(response);

      const ips: string[] = [];
      if (jsonResponse.Answer) {
        for (const answer of jsonResponse.Answer) {
          if (answer.type === 1) {
            // Type 1 is A record
            ips.push(answer.data);
          }
        }
      }

      console.log(
        `Parsed ${ips.length} IP(s) from JSON response from ${dnsUrl} for ${requestQuery}`
      );
      return ips;
    } catch (e) {
      console.warn(`Error querying ${dnsUrl} for ${requestQuery}: ${e}`);
      return [];
    }
  }

  static _httpGet(
    url: string,
    headers: Record<string, string> = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      get(url, { headers, timeout: DnsHelper.timeoutMilliseconds }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });
  }
}

export default DnsHelper;
