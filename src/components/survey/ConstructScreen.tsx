import type { ConstructScreenDef } from "@/lib/explr-stem";
import { LikertItem } from "./LikertItem";
import { RetrospectiveLikertItem } from "./RetrospectiveLikertItem";
import { CareerInterestItem } from "./CareerInterestItem";
import { EMPTY_ITEM_STATE, type SurveyItemState } from "./types";

/**
 * ConstructScreen — one survey screen = one construct. Renders the
 * construct name as the header, the required preamble if the construct
 * has one (Engineering & Technology always does), any instructions
 * (Career Interest), then the items vertically, one per row.
 *
 * Never renders more than one construct — students satisfice when shown
 * 37 items at once.
 */
export function ConstructScreen({
  screen,
  retrospective,
  responses,
  onSet,
}: {
  screen: ConstructScreenDef;
  retrospective: boolean;
  responses: Record<string, SurveyItemState>;
  onSet: (itemId: string, patch: Partial<SurveyItemState>) => void;
}) {
  const isCareer = screen.constructId === "career_interest";

  return (
    <div>
      <p className="eyebrow">Section</p>
      <h2 className="mt-1 text-2xl font-light">{screen.name}</h2>

      {screen.preamble && (
        <p className="mt-4 border-l-2 border-charcoal-200 pl-4 text-sm leading-relaxed text-charcoal-600">
          {screen.preamble}
        </p>
      )}
      {screen.instructions && (
        <p className="mt-4 text-sm leading-relaxed text-charcoal-600">
          {screen.instructions}
        </p>
      )}

      <div className="mt-4">
        {screen.items.map((item, idx) => {
          const st = responses[item.id] ?? EMPTY_ITEM_STATE;
          const number = idx + 1;

          if (isCareer) {
            return (
              <CareerInterestItem
                key={item.id}
                number={number}
                careerName={item.career_name ?? item.id}
                description={item.description ?? ""}
                points={screen.scaleDef.points}
                retrospective={retrospective}
                valueNow={st.now}
                valueThen={st.then}
                skipped={st.skipped}
                onChangeNow={(v) => onSet(item.id, { now: v, skipped: false })}
                onChangeThen={(v) => onSet(item.id, { then: v, skipped: false })}
                onSkip={() => onSet(item.id, { skipped: true })}
              />
            );
          }

          if (retrospective) {
            return (
              <RetrospectiveLikertItem
                key={item.id}
                number={number}
                text={item.text ?? item.id}
                points={screen.scaleDef.points}
                valueThen={st.then}
                valueNow={st.now}
                skipped={st.skipped}
                onChangeThen={(v) => onSet(item.id, { then: v, skipped: false })}
                onChangeNow={(v) => onSet(item.id, { now: v, skipped: false })}
                onSkip={() => onSet(item.id, { skipped: true })}
              />
            );
          }

          return (
            <LikertItem
              key={item.id}
              number={number}
              text={item.text ?? item.id}
              points={screen.scaleDef.points}
              value={st.now}
              skipped={st.skipped}
              onChange={(v) => onSet(item.id, { now: v, skipped: false })}
              onSkip={() => onSet(item.id, { skipped: true })}
            />
          );
        })}
      </div>
    </div>
  );
}
