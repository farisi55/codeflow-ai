export const MOCK_AI_RESPONSES: string[] = [
  `The Button component preserves the native button API while adding a typed visual variant. Its \`variant\` prop is derived from the class map, so adding a new key updates the accepted TypeScript values automatically. The remaining native props are forwarded to the button, including accessibility attributes and event handlers.

\`\`\`tsx
<Button variant="secondary" aria-label="Save draft">
  Save
</Button>
\`\`\`

That keeps the component small without sacrificing type safety.`,
  `I would separate the static feature data from the page and extract the repeated card markup into a focused component. The page then reads as composition rather than implementation detail, and the card can be tested in isolation.

\`\`\`tsx
function FeatureCard({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-slate-800 p-4">
      {children}
    </li>
  );
}
\`\`\`

Keep the array outside the component so it is not recreated on every render.`,
  `Use a discriminated union when each result state has different required fields. The shared literal key lets TypeScript narrow the object without assertions.

\`\`\`typescript
type LoadState =
  | { status: 'idle' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };
\`\`\`

After checking \`state.status === 'success'\`, the \`data\` field is available and correctly typed.`,
  `The component is readable, but I would address two issues before merging it. First, the mapped items need a stable domain key rather than an array index. Second, the click callback should not silently ignore a rejected promise.

\`\`\`tsx
onClick={() => {
  void saveProject(project.id).catch(showSaveError);
}}
\`\`\`

I would also add a disabled state while saving to prevent duplicate submissions.`,
  `A small grouping helper can preserve both the item type and the exact key type. It accepts readonly input, which makes it useful with constants as well as mutable arrays.

\`\`\`typescript
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    (groups[key] ??= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);
}
\`\`\`

Callers can group by strings, numbers, or symbols without losing the key type.`,
  `The hydration mismatch means the server rendered different text or markup from the browser's first render. A common cause is reading \`window\`, the current time, or local storage directly during rendering.

\`\`\`tsx
const [value, setValue] = useState<string | null>(null);

useEffect(() => {
  setValue(localStorage.getItem('preference'));
}, []);
\`\`\`

Render a stable loading state until the client-only value is available, and keep browser APIs inside effects or event handlers.`,
];
