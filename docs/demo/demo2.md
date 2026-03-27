The persistence config endpoint is ready. It's a GET call on the externaldatabus API 
(v1). You'll need to pass the cookie for auth — check the portal for how to get that.

The response gives you two fields: one tells you if persistence is on or off, and the
other tells you how long data is kept. The retention value uses some kind of shorthand
for time (minutes, hours, days — something like that).

There's also a sample response somewhere but I don't have it handy right now. Oh, and
the base URL uses the IED's IP address — the exact path I'll confirm later.
