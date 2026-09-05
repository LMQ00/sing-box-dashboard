# sing-box dashboard

Web dashboard for sing-box.

## Public instance

http://sing-box-dashboard.sagernet.org

For Chrome, you can use HTTPS, but not for other browsers.

Shortcut: dash.sing-box.app

## Providers (reF1nd fork)

This fork adds a **Providers** page for the [reF1nd/sing-box](https://github.com/reF1nd/sing-box)
fork, whose `providers` feature is exposed through the Clash API under
`/providers/proxies` (list, manual update via `PUT /providers/proxies/{name}`,
health check via `GET /providers/proxies/{name}/healthcheck`). The stock
sing-box kernel and the daemon RPC used by this dashboard have no provider
endpoints, hence the dedicated page.

### Requirements

- sing-box built from `reF1nd/sing-box` (stable branch, v1.14+) with `providers`
  configured and `experimental.clash_api` enabled.
- The Clash API must allow the origin the dashboard is served from:

  ```json
  {
    "experimental": {
      "clash_api": {
        "external_controller": "127.0.0.1:9090",
        "access_control_allow_origin": ["http://<dashboard-origin>"],
        "access_control_allow_private_network": true
      }
    }
  }
  ```

### Usage

1. Connect to the sing-box API service (daemon) as usual.
2. Open **Providers** in the sidebar.
3. Enter the Clash API URL (e.g. `http://127.0.0.1:9090`) and its secret if set,
   then click **Load**. The connection is remembered per server.
4. Each provider card shows vehicle type, last update time and node count.
   **Update** triggers a manual pull; **Health Check** triggers a health check
   run. Nodes can be expanded inline.

## LICENSE

```
Copyright (C) 2022 by nekohasekai <contact-sagernet@sekai.icu>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

In addition, no derivative work may use the name or imply association
with this application without prior consent.
```