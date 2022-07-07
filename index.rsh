'reach 0.1';

const commonFunctions = {
  seeNotification : Fun([Bool],Null),
  attacherMatched : Fun([Bool],Null),
};

export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...commonFunctions,
    swapDetails : Fun([], Tuple(Token, UInt, Token, UInt, UInt)),
    aliceAdd : Fun([], Address)    
  });
  const Bob = Participant('Bob', {
    ...commonFunctions,
    acceptSwap : Fun([Token, UInt, Token, UInt], Bool)
  });
  init();
  
  Alice.only(() => {
    const [IToken, IAmt, TToken, TAmt, time] = declassify(interact.swapDetails());
    assume(IToken != TToken);
    check(IAmt != 0);
    check(TAmt != 0)
  });
  
  Alice.publish(IToken, IAmt, TToken, TAmt, time);
  ;
  
  commit();
  Alice.pay([[IAmt, IToken]]);
  commit();
  
  Bob.only(() => {
    const accepted = declassify(interact.acceptSwap(IToken, IAmt, TToken, TAmt))
    assume(IToken != TToken);
  });


  Bob.publish(accepted);
  const transferWho = new Set();
  transferWho.insert(Bob);
  commit();

  if(accepted)
    each([Alice, Bob], () => interact.seeNotification(accepted));

  Bob.pay([[TAmt, TToken]])
  .when(accepted)
  .timeout(relativeTime(time), () => {
    Alice.publish();
    transfer(IAmt, IToken).to(Alice);
    
    commit();
    exit();
  });;    

  commit();

  Alice.only(() => {
    const aliceAddress = declassify(interact.aliceAdd());
  })
  
  Alice.publish(aliceAddress);
  
  if(transferWho.member(aliceAddress)){
    each([Alice, Bob], () => interact.attacherMatched(true));
    transfer(TAmt, TToken).to(Alice);
    transfer(IAmt, IToken).to(Bob);    
  }else{
    each([Alice, Bob], () => interact.attacherMatched(false));
    transfer(IAmt, IToken).to(Alice);
    transfer(TAmt, TToken).to(Bob)
  }
  commit();
  exit();
});