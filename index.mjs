import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const shouldFail = async (fp) => {
  let worked = undefined;
  try {
    await fp();
    worked = true;
  } catch (e) {
    worked = false;
  }
  console.log(`\tshouldFail = ${worked}`);
  if (worked !== false) {
    throw Error(`shouldFail`);
  }
};

const commonFunctions = {
  seeNotification : (accepted) => {
    if(accepted)
      console.log('Bob accepted the swap');
    else
      console.log('Bob rejected the swap')
  },
  attacherMatched : (accepted) => {
    if(accepted)
      console.log('Attacher Found');
    else
      console.log('Attached was not found')
  }
};

const startingBalance = stdlib.parseCurrency(100);

const time = stdlib.connector === 'CFX' ? 50 : 10;

const [ accAlice, accBob ] =
  await stdlib.newTestAccounts(2, startingBalance);
  const fmt = (x) => stdlib.formatCurrency(x, 4);
  const getBalance = async (who) => fmt(await stdlib.balanceOf(who));
  const beforeAlice = await getBalance(accAlice);
  const beforeBob = await getBalance(accBob);



const IToken = await stdlib.launchToken(accAlice, "eye", "II");
const TToken = await stdlib.launchToken(accAlice,'tee', 'TEE');


if ( stdlib.connector === 'ETH' || stdlib.connector === 'CFX' ) {
  const gasLimit = 5000000;
  accAlice.setGasLimit(gasLimit);
  accBob.setGasLimit(gasLimit);
} else if ( stdlib.connector == 'ALGO' ) {
  console.log(`Demonstrating need to opt-in on ALGO`);
  await shouldFail(async () => await zorkmid.mint(accAlice, startingBalance));
  console.log(`Opt-ing in on ALGO`);
  await accAlice.tokenAccept(IToken.id);
  await accAlice.tokenAccept(TToken.id);
  await accBob.tokenAccept(IToken.id);
  await accBob.tokenAccept(TToken.id);
}


await IToken.mint(accAlice, startingBalance.mul(2));
await TToken.mint(accBob, startingBalance.mul(2));

console.log('Launching...');
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

console.log('Starting backends...');

await Promise.all([
  backend.Alice(ctcAlice, {
    ...commonFunctions,
    swapDetails : () => {
        console.log("Alice is proposing Swap")
        return [IToken.id, 1, TToken.id, 2, time];
    },
    aliceAdd : () => {
      console.log('Providing Bob\'s Address');
      return accBob.getAddress();
    }
  }),
  backend.Bob(ctcBob, {
    ...commonFunctions,
    acceptSwap : (...v) => {
      console.log(`Bob accepts swap of`, v);
      return true;
    }
  }),
]);

console.log('Swap Completed!');
const afterAlice = await getBalance(accAlice);
const afterBob = await getBalance(accBob);

console.log(`Alice went from ${beforeAlice} to ${afterAlice}.`);
console.log(`Bob went from ${beforeBob} to ${afterBob}.`);