import { get } from 'https';

interface DnsRecord {
  web: string[];
  aff: string[];
  api: string[];
}

class DnsHelper {
  static timeoutMilliseconds = 1000;
  static https = "https://";

  static _defaultDnsUrls = [
    "https://doh.pub/dns-query",
    "https://doh.360.cn/resolve",
    "https://dns.alidns.com/resolve"
  ];

  static _dnsCache = new Map();

  static async lookupTxt(host, dnsUrls = DnsHelper._defaultDnsUrls) {
    for (const dnsUrl of dnsUrls) {
      try {
        const url = `${dnsUrl}?name=${host}&type=TXT`;
        const response = await DnsHelper._httpGet(url, { 'accept': 'application/dns-json' });
        const jsonResponse = JSON.parse(response);

        if (jsonResponse.Answer && jsonResponse.Answer.length > 0) {
          for (const answer of jsonResponse.Answer) {
            if (answer.type === 16) { // TXT record type
              const rdata = answer.data;
              console.log('Parsed TXT record:', rdata);
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

  static _parseData(data) {
    // Strip the leading and trailing double quotes from the data
    data = data.replace(/^"|"$/g, '');
    
    const parts = data.split(':');
    let web, host, aff, api;

    for (const part of parts) {
      const [key, value] = part.split('=');
      switch (key) {
        case 'host':
          host = DnsHelper.https + value;
          break;
        case 'web':
          web = DnsHelper.https + value;
          break;
        case 'aff':
          aff = DnsHelper.https + value;
          break;
        case 'api':
          api = value;
          break;
      }
    }

    return { data, host, web, aff, api };
  }

  static async lookupARecords(domain, dnsUrls = DnsHelper._defaultDnsUrls) {
    if (domain.toLowerCase() === 'localhost') {
      console.log('Skipping DNS lookup for localhost');
      return ['127.0.0.1'];
    }

    // Check cache first
    if (DnsHelper._dnsCache.has(domain)) {
      const cachedResult = DnsHelper._dnsCache.get(domain);
      if (Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
        console.log(`Returning cached A records for ${domain}: ${cachedResult.ips}`);
        return cachedResult.ips;
      }
    }

    const requestQuery = `name=${domain}&type=A`;
    const allIps = new Set();

    const promises = dnsUrls.map(dnsUrl => DnsHelper._queryDnsServer(dnsUrl, requestQuery));
    const results = await Promise.all(promises);

    for (const ips of results) {
      ips.forEach(ip => allIps.add(ip));
    }

    const uniqueIps = Array.from(allIps);

    // Cache the result
    DnsHelper._dnsCache.set(domain, { ips: uniqueIps, timestamp: Date.now() });

    console.log(`Found ${uniqueIps.length} unique IP(s) for ${domain}: ${uniqueIps}`);
    return uniqueIps;
  }

  static async _queryDnsServer(dnsUrl, requestQuery) {
    try {
      const url = `${dnsUrl}?${requestQuery}`;
      const response = await DnsHelper._httpGet(url);
      const jsonResponse = JSON.parse(response);

      const ips = [];
      if (jsonResponse.Answer) {
        for (const answer of jsonResponse.Answer) {
          if (answer.type === 1) { // Type 1 is A record
            ips.push(answer.data);
          }
        }
      }

      console.log(`Parsed ${ips.length} IP(s) from JSON response from ${dnsUrl} for ${requestQuery}`);
      return ips;
    } catch (e) {
      console.warn(`Error querying ${dnsUrl} for ${requestQuery}: ${e}`);
      return [];
    }
  }

  static _httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
      get(url, { headers, timeout: DnsHelper.timeoutMilliseconds }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
}

export default DnsHelper;
