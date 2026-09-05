import { useCallback, useEffect, useMemo, useState } from "react";

import { formatBytes, formatDateTime } from "../api/format";
import { fetchProviders, updateProvider, type ProviderInfo } from "../api/providers";
import { useApi } from "../app/context";
import { useI18n } from "../app/i18n";
import { loadStoredJson, saveStoredJson } from "../lib/storage";
import { Badge, Button, Card, DataLine, EmptyState, Field, SecretInput, Spinner } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import styles from "./ProvidersView.module.css";
import { cx } from "../lib/cx";

interface ClashConnection {
  url: string;
  secret: string;
}

function connectionStorageKey(serverId: string): string {
  return `providers-clash-api:${serverId}`;
}

function loadConnection(serverId: string): ClashConnection {
  const parsed = loadStoredJson(connectionStorageKey(serverId)) as Partial<ClashConnection> | null;
  return {
    url: typeof parsed?.url === "string" ? parsed.url : "",
    secret: typeof parsed?.secret === "string" ? parsed.secret : "",
  };
}

const NEVER_UPDATED = "0001-01-01T00:00:00Z";

export function ProvidersView() {
  const api = useApi();
  const { t } = useI18n();
  const [connection, setConnection] = useState<ClashConnection>(() =>
    loadConnection(api.config.id),
  );
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, ProviderInfo> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (target: ClashConnection) => {
      if (target.url.trim() === "") {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetchProviders(target.url.trim(), target.secret);
        setProviders(response.providers);
        saveStoredJson(connectionStorageKey(api.config.id), target);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setProviders(null);
      } finally {
        setLoading(false);
      }
    },
    [api.config.id],
  );

  // Reload when the active server changes; the stored connection follows the server.
  useEffect(() => {
    setProviders(null);
    setError(null);
    const stored = loadConnection(api.config.id);
    setConnection(stored);
    if (stored.url.trim() !== "") {
      void refresh(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.config.id]);

  const entries = providers === null ? [] : Object.values(providers);

  return (
    <div className="page">
      <PageHeader title={t("Providers")} />
      <Card title={t("Clash API")} className={styles.connectionCard}>
        <form
          className={styles.connectionForm}
          onSubmit={(event) => {
            event.preventDefault();
            void refresh(connection);
          }}
        >
          <Field label={t("URL")}>
            <input
              className="input"
              value={connection.url}
              placeholder="http://127.0.0.1:9090"
              onChange={(event) => setConnection({ ...connection, url: event.target.value })}
            />
          </Field>
          <Field label={t("Secret")}>
            <SecretInput
              value={connection.secret}
              placeholder={t("Optional")}
              onChange={(secret) => setConnection({ ...connection, secret })}
            />
          </Field>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner /> : t("Load")}
          </Button>
        </form>
        <div className={styles.connectionHint}>
          {t("Fetched through the Clash API of this sing-box instance (reF1nd fork).")}
        </div>
      </Card>
      {error !== null && <div className={styles.error}>{error}</div>}
      {loading && providers === null && (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      )}
      {!loading && providers !== null && entries.length === 0 && (
        <EmptyState>{t("No providers configured.")}</EmptyState>
      )}
      {entries.map((provider) => (
        <ProviderCard
          key={provider.name}
          provider={provider}
          connection={connection}
          onUpdated={() => refresh(connection)}
        />
      ))}
    </div>
  );
}

interface UpdateResult {
  ok: boolean;
  message: string;
  durationMs: number;
}

function ProviderCard(props: {
  provider: ProviderInfo;
  connection: ClashConnection;
  onUpdated: () => Promise<void>;
}) {
  const { t, language } = useI18n();
  const { provider } = props;
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  const updatedAt =
    provider.updatedAt === "" || provider.updatedAt.startsWith(NEVER_UPDATED.slice(0, 10))
      ? "—"
      : provider.updatedAt;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proxy of provider.proxies) {
      counts[proxy.type] = (counts[proxy.type] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([type, count]) => `${type} × ${count}`)
      .join(" · ");
  }, [provider.proxies]);

  const subscription = provider.subscriptionInfo ?? null;
  const hasSubscription = subscription !== null && (subscription.Total ?? 0) > 0;
  const expire = subscription !== null ? (subscription.Expire ?? 0) : 0;

  const runUpdate = async () => {
    setUpdating(true);
    const start = Date.now();
    try {
      await updateProvider(props.connection.url.trim(), props.connection.secret, provider.name);
      setResult({ ok: true, message: "", durationMs: Date.now() - start });
      await props.onUpdated();
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card
      icon="download"
      title={provider.name}
      actions={
        <>
          <Badge tone="info">{provider.vehicleType}</Badge>
          <Badge>{provider.type}</Badge>
        </>
      }
    >
      <div className="detail-card">
        <DataLine label={t("Last updated")} value={updatedAt} mono />
        <DataLine label={t("Nodes")} value={provider.proxies.length} />
        {typeCounts !== "" && <DataLine label={t("Node types")} value={typeCounts} />}
        {hasSubscription && (
          <DataLine
            label={t("Traffic")}
            value={`${t("Upload")} ${formatBytes(subscription?.Upload ?? 0)} · ${t("Download")} ${formatBytes(subscription?.Download ?? 0)} · ${t("Total")} ${formatBytes(subscription?.Total ?? 0)}`}
          />
        )}
        {subscription !== null && (
          <DataLine
            label={t("Expires")}
            value={expire > 0 ? formatDateTime(expire * 1000, language) : t("Unlimited")}
          />
        )}
      </div>
      {provider.proxies.length > 0 && (
        <details className={styles.nodeList}>
          <summary>{t("Show nodes")}</summary>
          <ul>
            {provider.proxies.map((proxy) => (
              <li key={proxy.name}>
                <span className={styles.nodeName}>{proxy.name}</span>
                <span className={styles.nodeType}>{proxy.type}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="row-actions">
        <Button onClick={runUpdate} disabled={updating}>
          {updating ? <Spinner /> : t("Update")}
        </Button>
        {updating && <span className={styles.updating}>{t("Updating...")}</span>}
      </div>
      {result !== null && (
        <div
          className={cx(styles.updateResult, result.ok ? styles.updateOk : styles.updateFail)}
          role="status"
        >
          {result.ok ? t("Update succeeded") : t("Update failed")}
          {!result.ok && result.message !== "" && `: ${result.message}`}
          {` · ${t("Updated in {seconds} s", { seconds: (result.durationMs / 1000).toFixed(1) })}`}
        </div>
      )}
    </Card>
  );
}
