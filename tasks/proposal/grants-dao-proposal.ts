import { task } from 'hardhat/config';
import { DRE, getImpersonatedSigner, advanceBlockTo, advanceBlock } from '../../helpers/misc-utils';

import AaveTokenV2Artifact from '@aave/aave-token/artifacts/contracts/token/AaveTokenV2.sol/AaveTokenV2.json';
import ERC20Artifact from '@aave/aave-token/artifacts/contracts/open-zeppelin/ERC20.sol/ERC20.json';
import GovernanceV2Artifact from '@aave/governance-v2/artifacts/contracts/governance/AaveGovernanceV2.sol/AaveGovernanceV2.json';

task('grants-dao-proposal', 'proposal to fund grants dao').setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');
  console.log(`Chain ID: ${(await DRE.ethers.provider.getNetwork()).chainId}`);

  const { ethers } = DRE;

  const txOverrides = {
    gasPrice: ethers.BigNumber.from('96103965700'),
  };

  const proposalSigner = await getImpersonatedSigner('0x4048c47b546b68ad226ea20b5f0acac49b086a21');
  await DRE.network.provider.send('hardhat_setBalance', [
    '0x4048c47b546b68ad226ea20b5f0acac49b086a21',
    '0xFFFFFFFFFFFFFFFFFF',
  ]);

  const controllerAaveEcosystemReserveAddress = '0x1e506cbb6721b83b1549fa1558332381ffa61a93';
  const grantsDaoMultiSig = '0x89C51828427F70D77875C6747759fB17Ba10Ceb0';
  const aaveEcosystemReserveAddress = '0x25F2226B597E8F9514B3F68F00f494cF4f286491';
  const controllerV2CollectorAddress = '0x7AB1e5c406F36FE20Ce7eBa528E182903CA8bFC7';
  const aaveCollectorV2Address = '0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c';

  const aaveGovernanceAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
  const aaveGovernance = new ethers.Contract(
    aaveGovernanceAddress,
    GovernanceV2Artifact.abi,
    proposalSigner
  );

  const aaveTokenAddress = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
  const aaveToken = new ethers.Contract(aaveTokenAddress, AaveTokenV2Artifact.abi, proposalSigner);

  const ausdcTokenAddress = '0xBcca60bB61934080951369a648Fb03DF4F96263C';
  const ausdcToken = new ethers.Contract(ausdcTokenAddress, ERC20Artifact.abi, proposalSigner);

  const initialReserveBalance = await aaveToken.balanceOf(aaveEcosystemReserveAddress);
  const initialGrantsBalance = await aaveToken.balanceOf(grantsDaoMultiSig);

  const initialReserveAusdcBalance = await ausdcToken.balanceOf(aaveCollectorV2Address);
  const initialGrantsAusdcBalance = await ausdcToken.balanceOf(grantsDaoMultiSig);

  console.log(`initialReserveBalance: ${ethers.utils.formatUnits(initialReserveBalance, 18)}`);
  console.log(`initialGrantsBalance: ${ethers.utils.formatUnits(initialGrantsBalance, 18)}`);

  console.log(
    `initialReserveAusdcBalance: ${ethers.utils.formatUnits(initialReserveAusdcBalance, 18)}`
  );
  console.log(
    `initialGrantsAusdcBalance: ${ethers.utils.formatUnits(initialGrantsAusdcBalance, 18)}`
  );

  const signature = 'transfer(address,address,uint256)';
  const signatureApprove = 'approve(address,address,uint256)';

  // $4,500,000 / 137.95 (coingecko @ 5/6/2022 6:00pm EST)
  const grantAmount = ethers.utils.parseUnits('32620.51', 18);
  console.log(`AAVE Grant Amount (no decimals):  ${grantAmount}`);
  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint256'],
    [aaveTokenAddress, grantsDaoMultiSig, grantAmount]
  );

  const ausdcGrantAmount = ethers.utils.parseUnits('1500000', 6);
  console.log(`aUSDC Grant Amount (no decimals):  ${ausdcGrantAmount}`);
  const encodedAusdcData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint256'],
    [ausdcTokenAddress, grantsDaoMultiSig, ausdcGrantAmount]
  );

  const executorAddress = '0xEE56e2B3D491590B5b31738cC34d5232F378a8D5';

  const targets = [controllerAaveEcosystemReserveAddress, controllerV2CollectorAddress];
  const values = [0, 0];
  const signatures = [signature, signatureApprove];
  const calldatas = [encodedData, encodedAusdcData];
  const withDelegatecalls = [false, false];
  const ipfsHash = '0x876d101db93e098b91046c83f57bcfbd4cfcc0a08af8ed460ce151920f7a69f0';

  console.log('\n INPUTS:');
  console.log(`executor: ${JSON.stringify(executorAddress, null, 2)}`);
  console.log(`targets: ${JSON.stringify(targets, null, 2)}`);
  console.log(`values: ${JSON.stringify(values, null, 2)}`);
  console.log(`signatures: ${JSON.stringify(signatures, null, 2)}`);
  console.log(`calldatas: ${JSON.stringify(calldatas, null, 2)}`);
  console.log(`withDelegatecalls: ${JSON.stringify(withDelegatecalls, null, 2)}`);
  console.log(`ipfsHash: ${ipfsHash}`);
  console.log('\n');

  console.log('create aip');
  const createTx = await aaveGovernance.create(
    executorAddress,
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
    ipfsHash,
    txOverrides
  );
  const createReceipt = await createTx.wait();
  const aipId = createReceipt.events[0].args.id;

  console.log(`aip id: ${aipId.toString()}`);

  const aaveWhale1Address = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';
  const aaveWhale2Address = '0x1d4296c4f14cc5edceb206f7634ae05c3bfc3cb7';
  const aaveWhale3Address = '0x7d439999E63B75618b9C6C69d6EFeD0C2Bc295c8';

  const aaveWhale1Signers = await getImpersonatedSigner(aaveWhale1Address);
  const aaveWhale2Signers = await getImpersonatedSigner(aaveWhale2Address);
  const aaveWhale3Signers = await getImpersonatedSigner(aaveWhale3Address);

  const voters = [aaveWhale1Signers, aaveWhale2Signers, aaveWhale3Signers];

  console.log(`vote on aip`);
  voters.forEach(async (signer) => {
    const tx = await aaveGovernance.connect(signer).submitVote(aipId, true, txOverrides);
    await tx.wait();
  });

  const proposal = await aaveGovernance.getProposalById(aipId);
  console.log(`voting end block: ${proposal.endBlock.toString()}`);
  console.log(`advance to voting end`);
  // Advance Block to End of Voting and Queue
  await advanceBlockTo(proposal.endBlock.add(1));

  console.log(`queue tx`);
  const queueTx = await aaveGovernance.queue(aipId, txOverrides);
  const queueTxReceipt = await queueTx.wait();

  // advance to execution
  console.log(`advance to execution time`);
  const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  const { timestamp } = currentBlock;
  const fastForwardTime = queueTxReceipt.events[1].args.executionTime.sub(timestamp).toNumber();
  await advanceBlock(timestamp + fastForwardTime + 10);

  // execute
  console.log(`execute tx`);
  const executeTx = await aaveGovernance.execute(aipId, txOverrides);
  await executeTx.wait();

  console.log(`check new balances`);

  const updatedReserveBalance = await aaveToken.balanceOf(aaveEcosystemReserveAddress);
  const updatedGrantsBalance = await aaveToken.balanceOf(grantsDaoMultiSig);

  console.log(`updatedReserveBalance: ${ethers.utils.formatUnits(updatedReserveBalance, 18)}`);
  console.log(`updatedGrantsBalance: ${ethers.utils.formatUnits(updatedGrantsBalance, 18)}`);
  console.log(`\n`);
  if (
    updatedReserveBalance.add(grantAmount).eq(initialReserveBalance) &&
    updatedGrantsBalance.sub(grantAmount).eq(initialGrantsBalance)
  ) {
    console.log(`SUCCESS: Balances updated as expected`);
  } else {
    console.log(`ERROR: Balances not expected`);
  }
});
