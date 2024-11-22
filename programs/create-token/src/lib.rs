#![allow(clippy::result_large_err)]

// Import các module cần thiết
use {
    anchor_lang::prelude::*,
    anchor_spl::{
        // Module để tạo và quản lý metadata cho token
        metadata::{
            create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
            CreateMetadataAccountsV3, Metadata,
        },
        // Module để tương tác với SPL Token Program
        token::{burn, Burn, Mint, MintTo, Token, TokenAccount, transfer, Transfer},
    },
};

// Khai báo Program ID trên Solana
declare_id!("5VebaeFAsUx3xWjngDkvoJKCDVUxdxVt8b7QSNnzDeTT");

#[program]
pub mod create_token {
    use super::*;

    // Instruction tạo một token mint mới với metadata
    pub fn create_token_mint(
        ctx: Context<CreateTokenMint>,
        _token_decimals: u8,      // Số thập phân của token (9 cho SPL, 0 cho NFT)
        token_name: String,       // Tên token
        token_symbol: String,     // Symbol của token
        token_uri: String,        // URI chứa metadata của token
    ) -> Result<()> {
        msg!("Creating metadata account...");
        msg!(
            "Metadata account address: {}",
            &ctx.accounts.metadata_account.key()
        );

        // Tạo metadata account thông qua Token Metadata Program
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.mint_account.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            // Cấu trúc metadata của token
            DataV2 {
                name: token_name,
                symbol: token_symbol,
                uri: token_uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false, // Token metadata có thể thay đổi không
            true,  // Update authority phải ký
            None,  // Thông tin collection (nếu token thuộc collection nào đó)
        )?;

        msg!("Token mint created successfully.");
        Ok(())
    }

    // Instruction mint token vào một token account
    pub fn mint_to(ctx: Context<MintToToken>, amount: u64) -> Result<()> {
        anchor_spl::token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )
    }

    // Instruction burn (đốt) token từ một token account
    pub fn burn_token(ctx: Context<BurnToken>, amount: u64) -> Result<()> {
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )
    }

    // Instruction chuyển token giữa các token account
    pub fn transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )
    }
}

// Struct định nghĩa các account cần thiết để tạo token mint
#[derive(Accounts)]
#[instruction(_token_decimals: u8)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,    // Người trả phí và ký transaction

    // Metadata account được tạo từ PDA
    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata_account: UncheckedAccount<'info>,

    // Tạo mint account mới
    #[account(
        init,
        payer = payer,
        mint::decimals = _token_decimals,
        mint::authority = payer.key(),
    )]
    pub mint_account: Account<'info, Mint>,

    // Các program cần thiết
    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// Struct định nghĩa các account cần thiết để mint token
#[derive(Accounts)]
pub struct MintToToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,              // Token mint account
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>, // Token account nhận token
    pub authority: Signer<'info>,                // Mint authority
    pub token_program: Program<'info, Token>,    // Token Program
}

// Struct định nghĩa các account cần thiết để burn token
#[derive(Accounts)]
pub struct BurnToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,              // Token mint account
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>, // Token account bị burn
    pub authority: Signer<'info>,                // Token owner
    pub token_program: Program<'info, Token>,    // Token Program
}

// Struct định nghĩa các account cần thiết để transfer token
#[derive(Accounts)]
pub struct TransferToken<'info> {
    pub mint: Account<'info, Mint>,              // Token mint account
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,      // Token account gửi
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,        // Token account nhận
    pub authority: Signer<'info>,                // Token owner
    pub token_program: Program<'info, Token>,    // Token Program
}