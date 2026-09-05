"""V2 structural validity: does the Python port reproduce the JS harness exactly?

Reads the fixture written by `research/dump-episodes.mjs`, replays every case
through the Python port, and compares field by field. Equality is exact, not
approximate: revenue, restow counts, rolled counts and cash are integers, and
the float fields round-trip through JSON without loss, so "close enough" would
be hiding a real divergence rather than tolerating a numeric one.

    node research/dump-episodes.mjs
    python -m research.pyharness.verify_parity

Run it from the repository root. A green run is what licenses the RL agents to
train against the Python environment and still be compared against A1-A4.
"""

import argparse
import json
import sys

from .agents import make_agent
from .circuit import run_episode

DEFAULT_FIXTURE = 'research/results/parity_js.json'


def _diff_fields(expected, actual, fields):
    out = []
    for f in fields:
        want = expected.get(f)
        got = actual.get(f)
        if want != got:
            out.append((f, want, got))
    return out


def _diff_utilisation(expected, actual):
    want = expected.get('utilisation')
    got = actual.get('utilisation')
    if want == got:
        return []
    if want is None or got is None or len(want) != len(got):
        return [('utilisation', want, got)]
    for i, (w, g) in enumerate(zip(want, got)):
        if w != g:
            return [('utilisation[%d]' % i, w, g)]
    return []


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fixture', nargs='?', default=DEFAULT_FIXTURE,
                        help='JSON written by research/dump-episodes.mjs')
    parser.add_argument('--verbose', action='store_true',
                        help='print one line per case instead of only failures')
    args = parser.parse_args(argv)

    try:
        with open(args.fixture, 'r', encoding='utf-8') as fh:
            payload = json.load(fh)
    except FileNotFoundError:
        print('fixture not found: %s' % args.fixture)
        print('generate it first:  node research/dump-episodes.mjs')
        return 2

    cases = payload['cases']
    expected_results = payload['results']
    fields = payload['comparedFields']
    a4_iterations = payload['a4Iterations']

    print('checking %d episodes against %s' % (len(cases), args.fixture))
    print('A4 budget %d iterations\n' % a4_iterations)

    failures = []
    for n, (case, expected) in enumerate(zip(cases, expected_results), start=1):
        name = case['agent']
        agent = make_agent(name, iterations=a4_iterations) if name == 'annealing' \
            else make_agent(name)

        actual = run_episode(
            agent, case['seed'],
            scenario=case['scenario'], replicate=case['replicate'])

        diffs = _diff_fields(expected, actual, fields) + _diff_utilisation(expected, actual)

        label = '%s seed=%d rep=%d' % (name, case['seed'], case['replicate'])
        if diffs:
            failures.append((label, diffs))
            print('  FAIL  %s' % label)
            for field, want, got in diffs[:5]:
                print('          %-22s js=%r  py=%r' % (field, want, got))
        elif args.verbose:
            print('  ok    %s  cash=%d' % (label, actual['cash']))

        if n % 25 == 0 and not args.verbose:
            print('  ... %d/%d' % (n, len(cases)))

    print()
    if failures:
        print('PARITY FAILED: %d of %d episodes diverged' % (len(failures), len(cases)))
        print('V2 is not satisfied - do not train against this environment yet.')
        return 1

    print('PARITY OK: %d episodes, every compared field identical' % len(cases))
    return 0


if __name__ == '__main__':
    sys.exit(main())
