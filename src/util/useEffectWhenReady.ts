import { useEffect } from 'react';


// Runs effect when all conditions are true
const useEffectWhenReady = (conditions, effect, deps) => {
  useEffect(() => {
    const allConditionsMet = conditions.every(condition => condition);
    if (!allConditionsMet) return;

    effect();
  }, [...deps, ...conditions]); 
};


export default useEffectWhenReady;