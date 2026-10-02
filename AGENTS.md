<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- NumNum uses Lovable Cloud for order persistence and server-verified customer/driver access, preventing public order exposure.
- Offline support uses vite-plugin-pwa with a preview-safe registration wrapper and network-first navigation.
- Customers sign in (Google/email); orders.user_id is set server-side from the session and RLS limits customers to their own orders — prevents cross-customer leaks. Driver panel stays PIN + server-side admin access.
