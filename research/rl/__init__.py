"""Learning agents for the thesis comparison.

`env.py` re-expresses one port-call as a sequential decision process so an RL
algorithm can drive it. Scoring still goes through `pyharness.circuit.run_episode`
so A5 and the RL comparators are measured by exactly the same accounting as
A1-A4.
"""
