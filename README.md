# Solana-GPT

Okay, so I came into work today ( Co-Working Spot ) and I saw there was a hackathon going on. A ChatGPT hackathon - so it was as good of time as any to try out a proof of concept my team and I have been pondering. What if you could pay-per-chatGPT question via crypto? So, I made the proof of concept. It was made in 8 hours or so with heavy help of ChatGPT itself!

Why would you pay?
- You get premium questions without the month subscription
- Anon question asking ( Also a tricky problem - double edged sword )
- Get around the pesky 25 questions per 3 hours

[Presentation](https://docs.google.com/presentation/d/1hW1Us3l0u3oOWCDJMefI0bWgOw9geqtVxt1pzT8soes/edit?usp=sharing)

Mainnet 'Hopper' Program Address `H8T4jm38UKJp2GBEG5s4X2NFT4U87CfLJVtTZVnh3zVs`

## System
1. You create a `Hopper` account and load it with 0.01 Solana
2. You ask Chat GPT questions, the server will deduct from your hopper account
3. You can close the `Hopper` account and redeem whatever solana is left over


# Problems
- Im not entirely sure of the legality of charging crypto for the API usage ( Why I'm not posting the link to the site )
- Having the Hopper API Wallet PK stored in Vercel gives me the heebies
- No filtering or rate limiting to stop me from getting my API key revoked ( Also why I'm not posting the link to the site )
- Taxes on crypto micro-payments is probably a pain I don't want to figure out

# How-Tos
Take a look at the .env files and READMEs Solana-GPT. I may come back here and give a more definative guide.

I use `pnpm install` for hack/ ( NextJS app )
I use `yarn install` for backend/ ( Solana Anchor )




