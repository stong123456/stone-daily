"use client";

import { Bomb, FirstAid, Timer, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { LoadingButton } from "@/components/LoadingButton";
import { formatRecordTime } from "@/services/format";

export function HistoryWorkspace() {
  const { records, removeRecord, clearRecords } = useAppState();
  const [clearing, setClearing] = useState(false);

  const clear = () => {
    setClearing(true);
    window.setTimeout(() => {
      clearRecords();
      setClearing(false);
    }, 450);
  };

  return (
    <>
      <header className="page-header page-header--inline"><div><span>Your pause log</span><h1>我的冷静记录</h1><p>保存你每一次上头前的停顿。所有记录只保存在这台设备上。</p></div>{records.length ? <LoadingButton icon={<Trash size={17} />} loading={clearing} onClick={clear} variant="danger">清空全部记录</LoadingButton> : null}</header>
      {records.length === 0 ? <section className="empty-state history-empty"><span><Timer size={28} weight="duotone" /></span><h2>这里还没有记录</h2><p>完成一次热点拆弹或后悔报告后，可以把结果留在这里，等市场冷静时再回来看看。</p></section> : <section className="history-list">{records.map((record) => <article className="history-item" key={record.id}><span className={`history-item__icon history-item__icon--${record.type}`}>{record.type === "regret" ? <FirstAid size={21} /> : <Bomb size={21} />}</span><div className="history-item__content"><div><span>{record.type === "regret" ? "后悔药按钮" : "热点拆弹器"}</span><time>{formatRecordTime(record.createdAt)}</time></div><h2>{record.input}</h2><p>{record.summary}</p></div><button aria-label="删除这条记录" className="icon-button" onClick={() => removeRecord(record.id)} type="button"><Trash size={18} /></button></article>)}</section>}
    </>
  );
}
