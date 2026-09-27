import { ConsensusOrbit } from "../components/Visuals.jsx";
import { GenLayerBadge } from "../components/Logo.jsx";
import { useReveal } from "../hooks/hooks.js";

function RevealBlock({ children, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

const FAQ = [
  {
    q: "Who decides the outcome?",
    a: "Nobody, by design. A randomly selected leader validator executes the resolution — fetching every declared evidence source and forming a verdict with an LLM. Independent validators then redo the work themselves: refetch the same sources, form their own judgment, and only accept the leader's exact outcome, confidence, and rationale if their own independent check agrees. If they disagree, GenLayer rotates to a new leader. Veritas never asks a human, and the creator has no special authority over the result.",
  },
  {
    q: "What happens if the evidence is ambiguous?",
    a: "The contract instructs validators to return UNRESOLVED rather than guess, and it also enforces a deterministic backstop: if fewer than half of the declared sources were reachable at all, the outcome is forced to UNRESOLVED regardless of what the model claims. An UNRESOLVED claim is voided — every staker gets a full refund, no fee.",
  },
  {
    q: "How is my payout calculated?",
    a: "Pari-mutuel, like a classic prediction market. Winners split the total pool from both sides, minus a small protocol fee (visible on every claim page, capped by protocol policy), in proportion to their own stake on the winning side. A void claim skips the fee entirely and refunds every position in full.",
  },
  {
    q: "Can the creator or anyone cancel a market they don't like?",
    a: "No cancel button exists. A market can only end in three ways: validator consensus resolves it YES or NO, it's voided because the resolution window elapsed unresolved, or it's voided because staking closed with no opposing side. All three are handled by ordinary, permissionless contract calls — no privileged role required.",
  },
  {
    q: "Is this trustless custody?",
    a: "Stakes live in the Intelligent Contract's own balance, controlled entirely by contract logic. Winnings are paid out as an on-chain value transfer the moment you call claim_winnings — no manual approval, no multisig, no admin withdrawal path for user funds. The only owner-gated actions are the protocol fee parameter and sweeping the protocol's own accrued fee — never a user's stake.",
  },
];

export function HowItWorksPage() {
  return (
    <section className="section page-narrow how-page">
      <div className="container">
        <span className="eyebrow">Mechanism</span>
        <h1 className="page-title">How Veritas actually reaches a verdict</h1>
        <p className="page-subtitle">
          Every other prediction market eventually needs a human — an admin, a committee, a
          Chainlink-style oracle operator — to type in the final answer. Veritas doesn't have one.
          Resolution is a GenLayer Intelligent Contract running{" "}
          <a href="https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy" target="_blank" rel="noreferrer">
            Optimistic Democracy
          </a>{" "}
          consensus over live public evidence.
        </p>

        <RevealBlock className="how-page__flow">
          <div className="flow-step">
            <span className="flow-step__num">1</span>
            <ConsensusOrbit state="idle" size={110} />
            <h3>A leader is chosen</h3>
            <p>
              Once staking closes, anyone can trigger resolution. GenLayer randomly selects a
              leader validator and a committee for this specific transaction.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__num">2</span>
            <ConsensusOrbit state="idle" size={110} />
            <h3>Independent verification</h3>
            <p>
              The leader fetches every source and proposes a verdict. Every other validator
              redoes the same work from scratch — their own fetch, their own model call — and
              checks whether their result actually supports the leader's exact answer.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__num">3</span>
            <ConsensusOrbit state="resolved-yes" size={110} />
            <h3>Consensus, on-chain</h3>
            <p>
              Only when a majority of independently-verifying validators agree is the outcome
              accepted and written to state. Disagreement simply rotates the leader and retries.
            </p>
          </div>
        </RevealBlock>

        <RevealBlock className="how-page__section">
          <h2>The exact contract logic</h2>
          <div className="code-panel">
            <pre>
{`def resolve_claim(self, claim_id: str) -> str:
    ...
    def leader_fn():
        evidence = _fetch_evidence(sources)          # gl.nondet.web.get on every source
        raw = gl.nondet.exec_prompt(
            _resolution_prompt(title, statement, category, evidence),
            response_format="json",
        )
        return _normalize_resolution(raw, sources, evidence)

    def validator_fn(leaders_res) -> bool:
        leader = leaders_res.calldata
        if not _resolution_materially_valid(leader, sources):
            return False
        validator_evidence = _fetch_evidence(sources)     # independently refetched
        verification = gl.nondet.exec_prompt(
            _verification_prompt(title, statement, validator_evidence, leader),
            response_format="json",
        )
        return _verification_accepts_report(leader, verification, validator_evidence, sources)

    review = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`}
            </pre>
          </div>
          <p className="how-page__code-note">
            This is the real, deployed contract — not a simplified summary. Read the full source
            in the project repository under <code>contracts/veritas.py</code>.
          </p>
        </RevealBlock>

        <RevealBlock className="how-page__section">
          <h2>Settlement math</h2>
          <div className="math-panel">
            <code>payout = my_stake_on_winning_side × (total_pool − protocol_fee) ÷ winning_pool</code>
          </div>
          <p>
            Classic pari-mutuel settlement. If a claim resolves YES, every YES staker splits the
            full pool — YES and NO combined, minus the fee — proportionally to what they put in.
            If a claim is voided, there is no fee: every position, YES and NO alike, is refunded
            in full.
          </p>
        </RevealBlock>

        <RevealBlock className="how-page__section">
          <h2>Frequently asked</h2>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </RevealBlock>

        <RevealBlock className="how-page__cta">
          <GenLayerBadge />
          <h2>Built entirely on GenLayer's Intelligent Contracts</h2>
          <p>No off-chain backend. No custodian. No oracle network. Just Python, on-chain.</p>
          <div className="hero__actions">
            <a href="#/create" className="btn btn--primary btn--lg">Create a claim</a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer" className="btn btn--outline btn--lg">
              Read the GenLayer docs
            </a>
          </div>
        </RevealBlock>
      </div>
    </section>
  );
}
