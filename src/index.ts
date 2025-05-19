export interface DnsRecord {
  web: string[];
  aff: string[];
  api: string[];
  app: string[];
}

export class DnsHelper {
  static timeoutMilliseconds = 5000;
  static https = "https://";
  static cacheExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  static _defaultDnsUrls: string[] = [
    "https://doh.pub/dns-query",
    "https://doh.360.cn/resolve",
    "https://dns.alidns.com/resolve",
  ];

  static _dnsCache: Map<string, { ips: string[]; timestamp: number }> =
    new Map();
  static _txtCache: Map<string, { record: DnsRecord; timestamp: number }> = new Map();

  private static _cleanExpiredCache<T>(
    cache: Map<string, { timestamp: number; [key: string]: any }>
  ): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    cache.forEach((value, key) => {
      if (now - value.timestamp > DnsHelper.cacheExpirationTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => cache.delete(key));
  }

  static async lookupTxt(
    host: string,
    dnsUrls: string[] = DnsHelper._defaultDnsUrls
  ): Promise<DnsRecord | null> {

    // Check cache
    if (DnsHelper._txtCache.has(host)) {
      // Clear expired cache
      DnsHelper._cleanExpiredCache(DnsHelper._txtCache);

      const cachedResult = DnsHelper._txtCache.get(host);
      if (cachedResult && Date.now() - cachedResult.timestamp < DnsHelper.cacheExpirationTime) {
        return cachedResult.record;
      }
    }

    for (const dnsUrl of dnsUrls) {
      try {
        const url = `${dnsUrl}?name=${host}&type=TXT`;
        const response = await DnsHelper._fetchWithTimeout(url, {
          headers: { accept: "application/dns-json" },
        });
        const jsonResponse = await response.json();

        if (jsonResponse.Answer && jsonResponse.Answer.length > 0) {
          for (const answer of jsonResponse.Answer) {
            if (answer.type === 16) {
              // TXT record type
              const rdata = answer.data;
              const record = DnsHelper._parseData(rdata);
              // Cache record
              DnsHelper._txtCache.set(host, { record, timestamp: Date.now() });
              return record;
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
      api: string[] = [],
      app: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split("=");
      switch (key) {
        case "web":
          web = value.split(",");
          break;
        case "aff":
          aff = value.split(",");
          break;
        case "api":
          api = value.split(",");
          break;
        case "app":
          app = value.split(",");
          break;
      }
    }

    return { web, aff, api, app };
  }

  static async lookupARecords(
    domain: string,
    dnsUrls: string[] = DnsHelper._defaultDnsUrls
  ): Promise<string[]> {
    if (domain.toLowerCase() === "localhost") {
      return ["127.0.0.1"];
    }

     // Clear expired cache unconditionally
     DnsHelper._cleanExpiredCache(DnsHelper._txtCache);

    // Check cache first
    if (DnsHelper._dnsCache.has(domain)) {

      const cachedResult = DnsHelper._dnsCache.get(domain);
      if (cachedResult && Date.now() - cachedResult.timestamp < DnsHelper.cacheExpirationTime) {
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

    return uniqueIps;
  }

  static async _queryDnsServer(
    dnsUrl: string,
    requestQuery: string
  ): Promise<string[]> {
    try {
      const url = `${dnsUrl}?${requestQuery}`;
      const response = await DnsHelper._fetchWithTimeout(url);
      const jsonResponse = await response.json();

      const ips: string[] = [];
      if (jsonResponse.Answer) {
        for (const answer of jsonResponse.Answer) {
          if (answer.type === 1) {
            // Type 1 is A record
            ips.push(answer.data);
          }
        }
      }

      return ips;
    } catch (e) {
      console.warn(`Error querying ${dnsUrl} for ${requestQuery}: ${e}`);
      return [];
    }
  }

  static async _fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(
      () => controller.abort(),
      DnsHelper.timeoutMilliseconds
    );

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    return response;
  }
}

export default DnsHelper;
