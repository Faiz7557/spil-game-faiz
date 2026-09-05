"""Python port of the research harness.

Mirrors research/src/*.mjs closely enough to be checked line by line, because
V2 structural validity is the claim that the two agree bit for bit on identical
seeds. Run `python -m research.pyharness.verify_parity` to check it.

The port exists so the RL agents in research/rl/ can step the environment
natively instead of paying an IPC round trip per step.
"""
