# Metric Proxy

Metric Proxy is a Cloudflare Worker project designed to handle and process metrics efficiently. It fetches HTML content from a given URL, converts imperial units to metric units, and returns the modified HTML content.

## Getting Started

### Prerequisites

- Node.js
- npm
- Cloudflare Wrangler CLI

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/metric-proxy.git
   cd metric-proxy
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## How It Works

The main functionality is implemented in the [`convertHTMLToMetric`](src/index.ts) function in [src/index.ts](src/index.ts). This function:

1. Fetches HTML content from a given URL.
2. Uses regular expressions to find and convert imperial units (e.g., cups, ounces, pounds) to metric units (e.g., milliliters, grams).
3. Returns the modified HTML content.

The worker listens for incoming requests, extracts the URL from the request, fetches the HTML content, processes it using `convertHTMLToMetric`, and returns the modified HTML content.

### Development

To start the development server, run:
```sh
npm run dev
```

### Deployment

To deploy the project to Cloudflare Workers, run:
```sh
npm run deploy
```

### Testing

To run the tests, use:
```sh
npm test
```

## License

This project is licensed under the MIT License.
