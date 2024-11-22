import * as anchor from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import type { CreateToken } from '../target/types/create_token';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

describe('Create Tokens', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CreateToken as anchor.Program<CreateToken>;

  const metadata = {
    name: 'Test Token',
    symbol: 'TEST',
    description: 'This is a test token',
    image: 'https://picsum.photos/200',
    uri: 'https://raw.githubusercontent.com/mocchaust64/test_program/main/assets/token-metadata.json',
    amount: 1000000000
  };

  it('Create an SPL Token!', async () => {
    const mintKeypair = new Keypair();
    
    // Tạo token mint
    const transactionSignature = await program.methods
      .createTokenMint(9, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    // Tạo token account cho người tạo
    const tokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
    );

    // Tạo Associated Token Account
    const createATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
    );

    const transaction = new anchor.web3.Transaction().add(createATAIx);
    await anchor.web3.sendAndConfirmTransaction(provider.connection, transaction, [payer.payer]);

    // Mint token với số lượng chỉ định
    await program.methods
      .mintTo(new BN(metadata.amount))
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        authority: payer.publicKey,
      })
      .rpc();

    console.log('Success!');
    console.log(`   Mint Address: ${mintKeypair.publicKey}`);
    console.log(`   Token Account: ${tokenAccount}`);
    console.log(`   Total Supply: ${metadata.amount}`);
  });

  it('Create an NFT!', async () => {
    // Generate new keypair to use as address for mint account.
    const mintKeypair = new Keypair();

    // NFT default = 0 decimals
    const transactionSignature = await program.methods
      .createTokenMint(0, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    console.log('Success!');
    console.log(`   Mint Address: ${mintKeypair.publicKey}`);
    console.log(`   Transaction Signature: ${transactionSignature}`);
  });

  it('Burn Token!', async () => {
    const mintKeypair = new Keypair();
    
    // Tạo token mint và mint token như các bước trước
    await program.methods
      .createTokenMint(9, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    const tokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
    );

    const transaction = new anchor.web3.Transaction().add(createATAIx);
    await anchor.web3.sendAndConfirmTransaction(provider.connection, transaction, [payer.payer]);

    await program.methods
      .mintTo(new BN(metadata.amount))
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        authority: payer.publicKey,
      })
      .rpc();

    // Burn một số lượng token
    const burnAmount = new BN(1000);
    await program.methods
      .burnToken(burnAmount)
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccount,
        authority: payer.publicKey,
      })
      .rpc();

    console.log('Success!');
    console.log(`   Burned Amount: ${burnAmount}`);
    console.log(`   Token Account: ${tokenAccount}`);
  });

  it('Transfer Token!', async () => {
    const mintKeypair = new Keypair();
    const receiverKeypair = new Keypair();
    
    // Tạo token mint và mint token như các bước trước
    await program.methods
      .createTokenMint(9, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    // Tạo token account cho người gửi (payer)
    const fromTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
    );

    // Tạo token account cho người nhận
    const toTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        receiverKeypair.publicKey
    );

    // Tạo ATA cho người gửi
    const createFromATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        fromTokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
    );

    // Tạo ATA cho người nhận
    const createToATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        toTokenAccount,
        receiverKeypair.publicKey,
        mintKeypair.publicKey
    );

    const transaction = new anchor.web3.Transaction()
        .add(createFromATAIx)
        .add(createToATAIx);
    
    await anchor.web3.sendAndConfirmTransaction(
        provider.connection, 
        transaction, 
        [payer.payer]
    );

    // Mint token cho người gửi
    await program.methods
      .mintTo(new BN(metadata.amount))
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: fromTokenAccount,
        authority: payer.publicKey,
      })
      .rpc();

    // Transfer token
    const transferAmount = new BN(1000);
    await program.methods
      .transferToken(transferAmount)
      .accounts({
        mint: mintKeypair.publicKey,
        from: fromTokenAccount,
        to: toTokenAccount,
        authority: payer.publicKey,
      })
      .rpc();

    console.log('Success!');
    console.log(`   Transfer Amount: ${transferAmount}`);
    console.log(`   From Account: ${fromTokenAccount}`);
    console.log(`   To Account: ${toTokenAccount}`);
  });
});
