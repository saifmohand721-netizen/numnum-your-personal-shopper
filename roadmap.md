# Roadmap

## Welcome & driver activation architecture (current)
- [ ] DB: profiles role/email/is_verified/is_online + user_roles + has_role + column-grant lockdown + no-delete rules
- [ ] Secret: DRIVER_PIN = 100869
- [ ] Welcome screen at / with customer/driver photo cards
- [ ] Move main app to public /home (browse without login; order needs sign-in)
- [ ] Driver registration/login at /driver-auth (name, phone, email, password, no OTP)
- [ ] Driver dashboard: activation lock screen (PIN), online/offline toggle
- [ ] Owner dashboard: drivers section (status badges, completed count, fees sum) + orders ledger tabs (completed-only totals)
- [ ] Tests for completed-only ledger totals; build + browser verification
- [ ] Update memory (driver login flow changed)
