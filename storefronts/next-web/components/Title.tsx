// @ts-nocheck
import { ReactNode } from "react";
import styles from "./Title.module.css";

export function Title({ children }: { children: ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}
