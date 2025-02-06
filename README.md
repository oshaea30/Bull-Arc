 # Bull Arc - Solana Token Creation Platform

Bull Arc is a modern web application built on the Solana blockchain that enables users to create, manage, and trade custom tokens with ease. The platform provides a seamless interface for token creation, portfolio management, and real-time market tracking.

![Screenshot 2025-02-05 at 11 24 42 PM](https://github.com/user-attachments/assets/44f5bd0d-f63f-4697-b6ef-6140676dc225)


## Features

- **Token Creation**: Create custom Solana tokens with configurable parameters
  - Custom name, symbol, and supply
  - Configurable decimals
  - Optional features: Buy/Sell tax, Reflection rewards
  - Automatic liquidity pool creation
  - Token metadata and image upload

- **Portfolio Management**: Track and manage your created tokens
  - Real-time price tracking
  - Portfolio value calculation
  - Transaction history
  - Token holder statistics

- **Trading Interface**: Built-in DEX integration
  - Real-time price charts
  - Market statistics
  - Buy/Sell functionality
  - Liquidity pool management

- **Trending Page**: Discover popular tokens
  - Recently added tokens
  - Top gainers
  - Most active tokens
  - Real-time market data

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Solana wallet (Phantom, Solflare, etc.)
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bull-arc.git
cd bull-arc
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and configure your environment variables:
```bash
cp .env.example .env
```

4. Update the following variables in your `.env` file:
```
VITE_SOLANA_NETWORK=devnet
VITE_RPC_ENDPOINT=https://api.devnet.solana.com
VITE_PINATA_API_KEY=your-pinata-api-key
VITE_PINATA_SECRET_KEY=your-pinata-secret-key
```

## Development

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the application:
```bash
npm run build
# or
yarn build
```

Preview the production build:
```bash
npm run preview
# or
yarn preview
```

## Testing

Run the token creation test script:
```bash
npm run test:token
# or
yarn test:token
```

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS
- **Blockchain**: Solana Web3.js
- **State Management**: React Context
- **Data Storage**: Supabase
- **File Storage**: IPFS (via Pinata)
- **API Integration**: CoinGecko

## Environment Variables

Required environment variables:

- `VITE_SOLANA_NETWORK`: Solana network to connect to (devnet/mainnet-beta)
- `VITE_RPC_ENDPOINT`: Solana RPC endpoint URL
- `VITE_PINATA_API_KEY`: Pinata API key for IPFS storage
- `VITE_PINATA_SECRET_KEY`: Pinata secret key
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_FEE_COLLECTOR_WALLET`: Wallet address for collecting fees
- `VITE_COINGECKO_API_KEY`: CoinGecko API key for market data

See `.env.example` for all available configuration options.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Security

If you discover any security-related issues, please email security@bullarc.com instead of using the issue tracker.

## Acknowledgments

- Solana Foundation
- Metaplex
- Raydium
- CoinGecko
- The Solana developer community
