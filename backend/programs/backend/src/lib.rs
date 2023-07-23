use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};

declare_id!("H8T4jm38UKJp2GBEG5s4X2NFT4U87CfLJVtTZVnh3zVs");

#[program]
pub mod backend {
    use super::*;

    pub fn load(ctx: Context<Load>, amount_to_load: u64) -> Result<()> {

        if !ctx.accounts.hopper.is_initialized {
            ctx.accounts.hopper.is_initialized = true;
            ctx.accounts.hopper.api = ctx.accounts.api.key();
            ctx.accounts.hopper.owner = ctx.accounts.owner.key();
            ctx.accounts.hopper.loaded_lamports = 0;
        }


        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.hopper.to_account_info(),
            });
        transfer(cpi_context, amount_to_load)?;

        ctx.accounts.hopper.loaded_lamports = ctx.accounts.hopper.loaded_lamports.checked_add(amount_to_load).unwrap();

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_to_withdraw: u64) -> Result<()> {

        if amount_to_withdraw > ctx.accounts.hopper.loaded_lamports {
            return Err(error!(HopperErrorCode::NotEnoughLoadedLamports));
        }

        let transfer_amount: u64 = amount_to_withdraw;

        // Decrease balance in donation_tally account
        **ctx.accounts.hopper.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;

        // Increase balance in community_wallet account
        **ctx.accounts.api.to_account_info().try_borrow_mut_lamports()? += transfer_amount;

        ctx.accounts.hopper.loaded_lamports = ctx.accounts.hopper.loaded_lamports.checked_sub(amount_to_withdraw).unwrap();


        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        let transfer_amount: u64 = ctx.accounts.hopper.loaded_lamports;

        // Decrease balance in donation_tally account
        **ctx.accounts.hopper.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;

        // Increase balance in community_wallet account
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += transfer_amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Load<'info>{
    #[account(
        init_if_needed, 
        seeds=[
            b"HOPPER", 
            api.key().as_ref(), 
            owner.key().as_ref()
        ], 
        bump, 
        payer = owner, 
        space= std::mem::size_of::<Hopper>() + 8 
    )]
    pub hopper: Account<'info, Hopper>,

    #[account(mut)]
    /// CHECK: Just need to pass it in for checks
    pub api: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
pub struct Withdraw <'info>{
    #[account(
        mut,
        has_one = api,
        has_one = owner,
        seeds=[
            b"HOPPER", 
            api.key().as_ref(), 
            owner.key().as_ref()
        ], 
        bump,
    )]
    pub hopper: Account<'info, Hopper>,

    #[account(mut)]
    pub api: Signer<'info>,

    #[account(mut)]
    /// CHECK: Just need to pass it in for checks
    pub owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Close <'info>{
    #[account(
        mut,
        close = owner,
        has_one = api,
        has_one = owner,
        seeds=[
            b"HOPPER", 
            api.key().as_ref(), 
            owner.key().as_ref()
        ], 
        bump,
    )]
    pub hopper: Account<'info, Hopper>,

    #[account(mut)]
    /// CHECK: Just need to pass it in for checks
    pub api: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Hopper {
    is_initialized: bool,
    loaded_lamports: u64,
    api: Pubkey,
    owner: Pubkey,
}

#[error_code]
pub enum HopperErrorCode {
    #[msg("Cannot withdraw more than the loaded amount")]
    NotEnoughLoadedLamports,
}

