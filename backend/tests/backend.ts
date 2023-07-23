import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Backend, IDL } from "../target/types/backend";

async function printHopper(program: Program<Backend>, hopperKey: anchor.web3.PublicKey){
  const account = await program.account.hopper.fetch(hopperKey);
    console.log("---- Hopper Account ----");
    console.log("- Owner:  ", account.owner.toString());
    console.log("- API:    ", account.api.toString());
    console.log("- Loaded: ", account.loadedLamports.toNumber());
    console.log("",);
  }

describe("backend", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Backend as Program<Backend>;
  const provider = anchor.getProvider();
  const wallet = anchor.workspace.Backend.provider.wallet as anchor.web3.Keypair;

  // API stuff
  const apiWallet = anchor.web3.Keypair.generate();
  let apiProvider: anchor.AnchorProvider;
  let apiProgram: anchor.Program<Backend>;

  // Account
  const [hopperKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("HOPPER"), apiWallet.publicKey.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  )
  

  before(async ()=>{
    apiProvider = new anchor.AnchorProvider(
      program.provider.connection,
      new anchor.Wallet(apiWallet),
      anchor.AnchorProvider.defaultOptions()
    );

    apiProgram = await new anchor.Program<Backend>(IDL, program.programId, apiProvider);

    await apiProvider.connection.requestAirdrop(apiWallet.publicKey, anchor.web3.LAMPORTS_PER_SOL);
  })

  it("Load", async () => {

    const amountToLoad = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

    await program.methods.load(
      amountToLoad
    ).accounts({
      hopper: hopperKey,
      api: apiWallet.publicKey,
      owner: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY
    })
    .rpc();

    await printHopper(program, hopperKey);

  });

  it("Withdraw", async () => {

    const amountToWithdraw = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.01);

    await apiProgram.methods.withdraw(
      amountToWithdraw
    ).accounts({
      hopper: hopperKey,
      api: apiWallet.publicKey,
      owner: provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

    await printHopper(program, hopperKey);

  });

  it("Close", async () => {

    try {
      await program.methods.close().accounts({
        hopper: hopperKey,
        api: apiWallet.publicKey,
        owner: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    } catch(e){
      console.log(e)
    }


    // await printHopper(program, hopperKey);

  });

});
