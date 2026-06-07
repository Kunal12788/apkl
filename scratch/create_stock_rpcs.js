import pkg from 'pg';
const { Client } = pkg;

async function createStockRpcs() {
  const client = new Client({
    user: 'postgres.quqcfbairoevddjcxiyi',
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    password: 'MZZ+6GY4bznXSpj',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log("Creating get_branch_stock RPC...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_branch_stock(p_branch_id uuid)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_alloc_pure_gold numeric := 0;
        v_alloc_pure_silver numeric := 0;
        
        v_pure_gold_given numeric := 0;
        v_pure_silver_given numeric := 0;
        
        v_impure_gold_received numeric := 0;
        v_impure_silver_received numeric := 0;
        
        v_impure_gold_refined numeric := 0;
        v_impure_silver_refined numeric := 0;
        
        v_pending_pure_gold numeric := 0;
        v_pending_pure_silver numeric := 0;
        
        v_result json;
      BEGIN
        -- 1. Allocations
        SELECT COALESCE(SUM(pure_weight), 0) INTO v_alloc_pure_gold
        FROM public.stock_allocations
        WHERE branch_id = p_branch_id AND metal = 'Gold';
        
        SELECT COALESCE(SUM(pure_weight), 0) INTO v_alloc_pure_silver
        FROM public.stock_allocations
        WHERE branch_id = p_branch_id AND metal = 'Silver';
        
        -- 2. Ledger Entries
        SELECT 
          COALESCE(SUM(pure_gold_out), 0),
          COALESCE(SUM(pure_silver_out), 0),
          COALESCE(SUM(impure_gold_in), 0),
          COALESCE(SUM(impure_silver_in), 0),
          COALESCE(SUM(impure_gold_out), 0),
          COALESCE(SUM(impure_silver_out), 0),
          COALESCE(SUM(pure_gold_due), 0),
          COALESCE(SUM(pure_silver_due), 0)
        INTO 
          v_pure_gold_given,
          v_pure_silver_given,
          v_impure_gold_received,
          v_impure_silver_received,
          v_impure_gold_refined,
          v_impure_silver_refined,
          v_pending_pure_gold,
          v_pending_pure_silver
        FROM public.ledger_entries
        WHERE staff_id IN (SELECT id FROM public.users WHERE branch_id = p_branch_id);

        -- Assemble JSON
        v_result := json_build_object(
          'totalAllocatedPureGold', v_alloc_pure_gold,
          'totalAllocatedPureSilver', v_alloc_pure_silver,
          'totalPureGoldGiven', v_pure_gold_given,
          'totalPureSilverGiven', v_pure_silver_given,
          'totalImpureGoldReceived', v_impure_gold_received,
          'totalImpureSilverReceived', v_impure_silver_received,
          'totalImpureGoldRefined', v_impure_gold_refined,
          'totalImpureSilverRefined', v_impure_silver_refined,
          'pendingPureGoldLiability', v_pending_pure_gold,
          'pendingPureSilverLiability', v_pending_pure_silver,
          'currentPureGoldStock', v_alloc_pure_gold - v_pure_gold_given,
          'currentPureSilverStock', v_alloc_pure_silver - v_pure_silver_given,
          'currentImpureGoldStock', v_impure_gold_received - v_impure_gold_refined,
          'currentImpureSilverStock', v_impure_silver_received - v_impure_silver_refined
        );
        
        RETURN v_result;
      END;
      $$;
    `);

    console.log("Creating get_super_admin_stock RPC...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_super_admin_stock()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_pure_gold_stock numeric := 0;
        v_pure_silver_stock numeric := 0;
        v_impure_gold_stock numeric := 0;
        v_impure_silver_stock numeric := 0;
        v_cash_stock numeric := 0;
      BEGIN
        SELECT 
          COALESCE(SUM(pure_gold_change), 0),
          COALESCE(SUM(pure_silver_change), 0),
          COALESCE(SUM(impure_gold_change), 0),
          COALESCE(SUM(impure_silver_change), 0),
          COALESCE(SUM(cash_change), 0)
        INTO 
          v_pure_gold_stock,
          v_pure_silver_stock,
          v_impure_gold_stock,
          v_impure_silver_stock,
          v_cash_stock
        FROM public.super_admin_ledger;

        RETURN json_build_object(
          'currentPureGoldStock', v_pure_gold_stock,
          'currentPureSilverStock', v_pure_silver_stock,
          'currentImpureGoldStock', v_impure_gold_stock,
          'currentImpureSilverStock', v_impure_silver_stock,
          'currentCashStock', v_cash_stock
        );
      END;
      $$;
    `);

    console.log("RPC functions created successfully!");

  } catch (err) {
    console.error("Error creating RPC:", err);
  } finally {
    await client.end();
  }
}

createStockRpcs();
