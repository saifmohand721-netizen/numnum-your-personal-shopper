# Roadmap

## Welcome & driver activation architecture (current)
- [x] DB: profiles role/email/is_verified/is_online + user_roles + has_role + column-grant lockdown + no-delete rules
- [x] Secret: DRIVER_PIN = 100869
- [x] Driver server functions: getDriverState / activateDriver / setDriverOnline / getDriverOrders / updateDriverOrder
- [x] Welcome screen at / with customer/driver photo cards
- [x] Move main app to public /home (browse without login; order needs sign-in)
- [x] Driver registration/login at /driver-auth (name, phone, email, password, no OTP)
- [x] Driver dashboard: activation lock screen (PIN), online/offline toggle
- [x] Owner dashboard: drivers section (status badges, completed count, fees sum) + orders ledger tabs (completed-only totals)
- [ ] Tests for completed-only ledger totals; build + browser verification
- [ ] Update memory (driver login flow changed)
